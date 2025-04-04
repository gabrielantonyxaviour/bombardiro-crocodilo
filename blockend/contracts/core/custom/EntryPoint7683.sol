// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;
/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import "../../interfaces/IAccount.sol";
import "../../interfaces/IAccountExecute.sol";
import "../../interfaces/IPaymaster.sol";
import "../../interfaces/IEntryPoint.sol";

import "../../utils/Exec.sol";
import "../StakeManager.sol";
import "../SenderCreator.sol";
import "../Helpers.sol";
import "../NonceManager.sol";
import "../UserOperationLib.sol";

import "../Base7683.sol";
import {OrderData, OrderEncoder} from "../libs/OrderEncoder.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
 * Account-Abstraction (EIP-4337) singleton EntryPoint7683 implementation.
 * Only one instance required on each chain.
 */

/// @custom:security-contact https://bounty.ethereum.org
abstract contract EntryPoint7683 is
    IEntryPoint,
    Base7683,
    StakeManager,
    NonceManager,
    ReentrancyGuard,
    ERC165
{
    using UserOperationLib for PackedUserOperation;
    // ============ Libraries for ERC 7683 ============
    using SafeERC20 for IERC20;

    SenderCreator private immutable _senderCreator = new SenderCreator();

    function senderCreator() internal view virtual returns (SenderCreator) {
        return _senderCreator;
    }

    //compensate for innerHandleOps' emit message and deposit refund.
    // allow some slack for future gas price changes.
    uint256 private constant INNER_GAS_OVERHEAD = 10000;

    // Marker for inner call revert on out of gas
    bytes32 private constant INNER_OUT_OF_GAS = hex"deaddead";
    bytes32 private constant INNER_REVERT_LOW_PREFUND = hex"deadaa51";

    uint256 private constant REVERT_REASON_MAX_LEN = 2048;
    uint256 private constant PENALTY_PERCENT = 10;

    // ============ Constants for ERC7683 ============
    /// @notice Status constant indicating that an order has been settled.
    bytes32 public constant SETTLED = "SETTLED";
    /// @notice Status constant indicating that an order has been settled and the status is updated on World Chain.
    bytes32 public constant SETTLED_WORLD = "SETTLED_WORLD";
    /// @notice Status constant indicating that an order has been refunded.
    bytes32 public constant REFUNDED = "REFUNDED";
    /// @notice Status constant indicating that an order has been refunded and the status is updated on World Chain.
    bytes32 public constant REFUNDED_WORLD = "REFUNDED_WORLD";
    /// @notice The domain ID of the world contract.
    uint32 public constant worldDomainId = 480;

    /// ============ World Verification Variables ============

    mapping(address => bool) public isHumanVerifiedSigner;

    // ============ Upgrade Gap for ERC7683 ============
    /// @dev Reserved storage slots for upgradeability.
    uint256[47] private __GAP;

    // ============ Events for ERC7683 ============
    /**
     * @notice Emitted when an order is settled.
     * @param orderId The ID of the settled order.
     * @param receiver The address of the order's input token receiver.
     */
    event Settled(bytes32 orderId, address receiver);

    /**
     * @notice Emitted when an order is settled on the world chain.
     * @param orderId The ID of the settled order.
     */
    event SettledWorld(bytes32 orderId);

    /**
     * @notice Emitted when an order is refunded.
     * @param orderId The ID of the refunded order.
     * @param receiver The address of the order's input token receiver.
     */
    event Refunded(bytes32 orderId, address receiver);

    /**
     * @notice Emitted when an order is refunded on the world chain.
     * @param orderId The ID of the refunded order.
     */
    event RefundedWorld(bytes32 orderId);

    // ============ Errors for ERC7683 ============

    error InvalidOrderType(bytes32 orderType);
    error InvalidOriginDomain(uint32 originDomain);
    error InvalidOnchainOrderSettler();
    error InvalidOrderId();
    error OrderFillExpired();
    error InvalidOrderDomain();
    error InvalidDomain();
    error InvalidSender();

    error DisabledFunction();

    // ============ Constructor ============
    /**
     * @dev Initializes the contract by calling the constructor of Base7683 with the permit2 address.
     * @param _permit2 The address of the PERMIT2 contract.
     */
    constructor(address _permit2) Base7683(_permit2) {}

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        // note: solidity "type(IEntryPoint).interfaceId" is without inherited methods but we want to check everything
        return
            interfaceId ==
            (type(IEntryPoint).interfaceId ^
                type(IStakeManager).interfaceId ^
                type(INonceManager).interfaceId) ||
            interfaceId == type(IEntryPoint).interfaceId ||
            interfaceId == type(IStakeManager).interfaceId ||
            interfaceId == type(INonceManager).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * Compensate the caller's beneficiary address with the collected fees of all UserOperations.
     * @param beneficiary - The address to receive the fees.
     * @param amount      - Amount to transfer.
     */
    function _compensate(address payable beneficiary, uint256 amount) internal {
        require(beneficiary != address(0), "AA90 invalid beneficiary");
        (bool success, ) = beneficiary.call{value: amount}("");
        require(success, "AA91 failed send to beneficiary");
    }

    /**
     * Execute a user operation.
     * @param opIndex    - Index into the opInfo array.
     * @param userOp     - The userOp to execute.
     * @param opInfo     - The opInfo filled by validatePrepayment for this userOp.
     * @return collected - The total amount this userOp paid.
     */
    function _executeUserOp(
        uint256 opIndex,
        PackedUserOperation calldata userOp,
        UserOpInfo memory opInfo
    ) internal returns (uint256 collected) {
        uint256 preGas = gasleft();
        bytes memory context = getMemoryBytesFromOffset(opInfo.contextOffset);
        bool success;
        {
            uint256 saveFreePtr;
            assembly ("memory-safe") {
                saveFreePtr := mload(0x40)
            }
            bytes calldata callData = userOp.callData;
            bytes memory innerCall;
            bytes4 methodSig;
            assembly {
                let len := callData.length
                if gt(len, 3) {
                    methodSig := calldataload(callData.offset)
                }
            }
            if (methodSig == IAccountExecute.executeUserOp.selector) {
                bytes memory executeUserOp = abi.encodeCall(
                    IAccountExecute.executeUserOp,
                    (userOp, opInfo.userOpHash)
                );
                innerCall = abi.encodeCall(
                    this.innerHandleOp,
                    (executeUserOp, opInfo, context)
                );
            } else {
                innerCall = abi.encodeCall(
                    this.innerHandleOp,
                    (callData, opInfo, context)
                );
            }
            assembly ("memory-safe") {
                success := call(
                    gas(),
                    address(),
                    0,
                    add(innerCall, 0x20),
                    mload(innerCall),
                    0,
                    32
                )
                collected := mload(0)
                mstore(0x40, saveFreePtr)
            }
        }
        if (!success) {
            bytes32 innerRevertCode;
            assembly ("memory-safe") {
                let len := returndatasize()
                if eq(32, len) {
                    returndatacopy(0, 0, 32)
                    innerRevertCode := mload(0)
                }
            }
            if (innerRevertCode == INNER_OUT_OF_GAS) {
                // handleOps was called with gas limit too low. abort entire bundle.
                //can only be caused by bundler (leaving not enough gas for inner call)
                revert FailedOp(opIndex, "AA95 out of gas");
            } else if (innerRevertCode == INNER_REVERT_LOW_PREFUND) {
                // innerCall reverted on prefund too low. treat entire prefund as "gas cost"
                uint256 actualGas = preGas - gasleft() + opInfo.preOpGas;
                uint256 actualGasCost = opInfo.prefund;
                emitPrefundTooLow(opInfo);
                emitUserOperationEvent(opInfo, false, actualGasCost, actualGas);
                collected = actualGasCost;
            } else {
                emit PostOpRevertReason(
                    opInfo.userOpHash,
                    opInfo.mUserOp.sender,
                    opInfo.mUserOp.nonce,
                    Exec.getReturnData(REVERT_REASON_MAX_LEN)
                );

                uint256 actualGas = preGas - gasleft() + opInfo.preOpGas;
                collected = _postExecution(
                    IPaymaster.PostOpMode.postOpReverted,
                    opInfo,
                    context,
                    actualGas
                );
            }
        }
    }

    function emitUserOperationEvent(
        UserOpInfo memory opInfo,
        bool success,
        uint256 actualGasCost,
        uint256 actualGas
    ) internal virtual {
        emit UserOperationEvent(
            opInfo.userOpHash,
            opInfo.mUserOp.sender,
            opInfo.mUserOp.paymaster,
            opInfo.mUserOp.nonce,
            success,
            actualGasCost,
            actualGas
        );
    }

    function emitPrefundTooLow(UserOpInfo memory opInfo) internal virtual {
        emit UserOperationPrefundTooLow(
            opInfo.userOpHash,
            opInfo.mUserOp.sender,
            opInfo.mUserOp.nonce
        );
    }

    /// @inheritdoc IEntryPoint
    function handleOps(
        PackedUserOperation[] calldata ops,
        address payable beneficiary
    ) public nonReentrant {
        uint256 opslen = ops.length;
        UserOpInfo[] memory opInfos = new UserOpInfo[](opslen);

        unchecked {
            for (uint256 i = 0; i < opslen; i++) {
                UserOpInfo memory opInfo = opInfos[i];
                (
                    uint256 validationData,
                    uint256 pmValidationData
                ) = _validatePrepayment(i, ops[i], opInfo);
                _validateAccountAndPaymasterValidationData(
                    i,
                    validationData,
                    pmValidationData,
                    address(0)
                );
            }

            uint256 collected = 0;
            emit BeforeExecution();

            for (uint256 i = 0; i < opslen; i++) {
                collected += _executeUserOp(i, ops[i], opInfos[i]);
            }

            _compensate(beneficiary, collected);
        }
    }

    /// @inheritdoc IEntryPoint
    function handleAggregatedOps(
        UserOpsPerAggregator[] calldata opsPerAggregator,
        address payable beneficiary
    ) public nonReentrant {
        revert DisabledFunction();
        // uint256 opasLen = opsPerAggregator.length;
        // uint256 totalOps = 0;
        // for (uint256 i = 0; i < opasLen; i++) {
        //     UserOpsPerAggregator calldata opa = opsPerAggregator[i];
        //     PackedUserOperation[] calldata ops = opa.userOps;
        //     IAggregator aggregator = opa.aggregator;

        //     //address(1) is special marker of "signature error"
        //     require(
        //         address(aggregator) != address(1),
        //         "AA96 invalid aggregator"
        //     );

        //     if (address(aggregator) != address(0)) {
        //         // solhint-disable-next-line no-empty-blocks
        //         try aggregator.validateSignatures(ops, opa.signature) {} catch {
        //             revert SignatureValidationFailed(address(aggregator));
        //         }
        //     }

        //     totalOps += ops.length;
        // }

        // UserOpInfo[] memory opInfos = new UserOpInfo[](totalOps);

        // uint256 opIndex = 0;
        // for (uint256 a = 0; a < opasLen; a++) {
        //     UserOpsPerAggregator calldata opa = opsPerAggregator[a];
        //     PackedUserOperation[] calldata ops = opa.userOps;
        //     IAggregator aggregator = opa.aggregator;

        //     uint256 opslen = ops.length;
        //     for (uint256 i = 0; i < opslen; i++) {
        //         UserOpInfo memory opInfo = opInfos[opIndex];
        //         (
        //             uint256 validationData,
        //             uint256 paymasterValidationData
        //         ) = _validatePrepayment(opIndex, ops[i], opInfo);
        //         _validateAccountAndPaymasterValidationData(
        //             i,
        //             validationData,
        //             paymasterValidationData,
        //             address(aggregator)
        //         );
        //         opIndex++;
        //     }
        // }

        // emit BeforeExecution();

        // uint256 collected = 0;
        // opIndex = 0;
        // for (uint256 a = 0; a < opasLen; a++) {
        //     UserOpsPerAggregator calldata opa = opsPerAggregator[a];
        //     emit SignatureAggregatorChanged(address(opa.aggregator));
        //     PackedUserOperation[] calldata ops = opa.userOps;
        //     uint256 opslen = ops.length;

        //     for (uint256 i = 0; i < opslen; i++) {
        //         collected += _executeUserOp(opIndex, ops[i], opInfos[opIndex]);
        //         opIndex++;
        //     }
        // }
        // emit SignatureAggregatorChanged(address(0));

        // _compensate(beneficiary, collected);
    }

    /**
     * A memory copy of UserOp static fields only.
     * Excluding: callData, initCode and signature. Replacing paymasterAndData with paymaster.
     */
    struct MemoryUserOp {
        address sender;
        uint256 nonce;
        uint256 verificationGasLimit;
        uint256 callGasLimit;
        uint256 paymasterVerificationGasLimit;
        uint256 paymasterPostOpGasLimit;
        uint256 preVerificationGas;
        address paymaster;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
    }

    struct UserOpInfo {
        MemoryUserOp mUserOp;
        bytes32 userOpHash;
        uint256 prefund;
        uint256 contextOffset;
        uint256 preOpGas;
    }

    /**
     * Inner function to handle a UserOperation.
     * Must be declared "external" to open a call context, but it can only be called by handleOps.
     * @param callData - The callData to execute.
     * @param opInfo   - The UserOpInfo struct.
     * @param context  - The context bytes.
     * @return actualGasCost - the actual cost in eth this UserOperation paid for gas
     */
    function innerHandleOp(
        bytes memory callData,
        UserOpInfo memory opInfo,
        bytes calldata context
    ) external returns (uint256 actualGasCost) {
        uint256 preGas = gasleft();
        require(msg.sender == address(this), "AA92 internal call only");
        MemoryUserOp memory mUserOp = opInfo.mUserOp;

        uint256 callGasLimit = mUserOp.callGasLimit;
        unchecked {
            // handleOps was called with gas limit too low. abort entire bundle.
            if (
                (gasleft() * 63) / 64 <
                callGasLimit +
                    mUserOp.paymasterPostOpGasLimit +
                    INNER_GAS_OVERHEAD
            ) {
                assembly ("memory-safe") {
                    mstore(0, INNER_OUT_OF_GAS)
                    revert(0, 32)
                }
            }
        }

        IPaymaster.PostOpMode mode = IPaymaster.PostOpMode.opSucceeded;
        if (callData.length > 0) {
            bool success = Exec.call(mUserOp.sender, 0, callData, callGasLimit);
            if (!success) {
                bytes memory result = Exec.getReturnData(REVERT_REASON_MAX_LEN);
                if (result.length > 0) {
                    emit UserOperationRevertReason(
                        opInfo.userOpHash,
                        mUserOp.sender,
                        mUserOp.nonce,
                        result
                    );
                }
                mode = IPaymaster.PostOpMode.opReverted;
            }
        }

        unchecked {
            uint256 actualGas = preGas - gasleft() + opInfo.preOpGas;
            return _postExecution(mode, opInfo, context, actualGas);
        }
    }

    /// @inheritdoc IEntryPoint
    function getUserOpHash(
        PackedUserOperation calldata userOp
    ) public view returns (bytes32) {
        return
            keccak256(abi.encode(userOp.hash(), address(this), block.chainid));
    }

    /**
     * Copy general fields from userOp into the memory opInfo structure.
     * @param userOp  - The user operation.
     * @param mUserOp - The memory user operation.
     */
    function _copyUserOpToMemory(
        PackedUserOperation calldata userOp,
        MemoryUserOp memory mUserOp
    ) internal pure {
        mUserOp.sender = userOp.sender;
        mUserOp.nonce = userOp.nonce;
        (mUserOp.verificationGasLimit, mUserOp.callGasLimit) = UserOperationLib
            .unpackUints(userOp.accountGasLimits);
        mUserOp.preVerificationGas = userOp.preVerificationGas;
        (mUserOp.maxPriorityFeePerGas, mUserOp.maxFeePerGas) = UserOperationLib
            .unpackUints(userOp.gasFees);
        bytes calldata paymasterAndData = userOp.paymasterAndData;
        if (paymasterAndData.length > 0) {
            require(
                paymasterAndData.length >=
                    UserOperationLib.PAYMASTER_DATA_OFFSET,
                "AA93 invalid paymasterAndData"
            );
            (
                mUserOp.paymaster,
                mUserOp.paymasterVerificationGasLimit,
                mUserOp.paymasterPostOpGasLimit
            ) = UserOperationLib.unpackPaymasterStaticFields(paymasterAndData);
        } else {
            mUserOp.paymaster = address(0);
            mUserOp.paymasterVerificationGasLimit = 0;
            mUserOp.paymasterPostOpGasLimit = 0;
        }
    }

    /**
     * Get the required prefunded gas fee amount for an operation.
     * @param mUserOp - The user operation in memory.
     */
    function _getRequiredPrefund(
        MemoryUserOp memory mUserOp
    ) internal pure returns (uint256 requiredPrefund) {
        unchecked {
            uint256 requiredGas = mUserOp.verificationGasLimit +
                mUserOp.callGasLimit +
                mUserOp.paymasterVerificationGasLimit +
                mUserOp.paymasterPostOpGasLimit +
                mUserOp.preVerificationGas;

            requiredPrefund = requiredGas * mUserOp.maxFeePerGas;
        }
    }

    /**
     * Create sender smart contract account if init code is provided.
     * @param opIndex  - The operation index.
     * @param opInfo   - The operation info.
     * @param initCode - The init code for the smart contract account.
     */
    function _createSenderIfNeeded(
        uint256 opIndex,
        UserOpInfo memory opInfo,
        bytes calldata initCode
    ) internal {
        if (initCode.length != 0) {
            address sender = opInfo.mUserOp.sender;
            if (sender.code.length != 0)
                revert FailedOp(opIndex, "AA10 sender already constructed");
            address sender1 = senderCreator().createSender{
                gas: opInfo.mUserOp.verificationGasLimit
            }(initCode);
            if (sender1 == address(0))
                revert FailedOp(opIndex, "AA13 initCode failed or OOG");
            if (sender1 != sender)
                revert FailedOp(opIndex, "AA14 initCode must return sender");
            if (sender1.code.length == 0)
                revert FailedOp(opIndex, "AA15 initCode must create sender");
            address factory = address(bytes20(initCode[0:20]));
            emit AccountDeployed(
                opInfo.userOpHash,
                sender,
                factory,
                opInfo.mUserOp.paymaster
            );
        }
    }

    /// @inheritdoc IEntryPoint
    function getSenderAddress(bytes calldata initCode) public {
        address sender = senderCreator().createSender(initCode);
        revert SenderAddressResult(sender);
    }

    /**
     * Call account.validateUserOp.
     * Revert (with FailedOp) in case validateUserOp reverts, or account didn't send required prefund.
     * Decrement account's deposit if needed.
     * @param opIndex         - The operation index.
     * @param op              - The user operation.
     * @param opInfo          - The operation info.
     * @param requiredPrefund - The required prefund amount.
     */
    function _validateAccountPrepayment(
        uint256 opIndex,
        PackedUserOperation calldata op,
        UserOpInfo memory opInfo,
        uint256 requiredPrefund,
        uint256 verificationGasLimit
    ) internal returns (uint256 validationData) {
        unchecked {
            MemoryUserOp memory mUserOp = opInfo.mUserOp;
            address sender = mUserOp.sender;
            _createSenderIfNeeded(opIndex, opInfo, op.initCode);
            address paymaster = mUserOp.paymaster;
            uint256 missingAccountFunds = 0;
            if (paymaster == address(0)) {
                uint256 bal = balanceOf(sender);
                missingAccountFunds = bal > requiredPrefund
                    ? 0
                    : requiredPrefund - bal;
            }
            try
                IAccount(sender).validateUserOp{gas: verificationGasLimit}(
                    op,
                    opInfo.userOpHash,
                    missingAccountFunds
                )
            returns (uint256 _validationData) {
                validationData = _validationData;
            } catch {
                revert FailedOpWithRevert(
                    opIndex,
                    "AA23 reverted",
                    Exec.getReturnData(REVERT_REASON_MAX_LEN)
                );
            }
            if (paymaster == address(0)) {
                DepositInfo storage senderInfo = deposits[sender];
                uint256 deposit = senderInfo.deposit;
                if (requiredPrefund > deposit) {
                    revert FailedOp(opIndex, "AA21 didn't pay prefund");
                }
                senderInfo.deposit = deposit - requiredPrefund;
            }
        }
    }

    /**
     * In case the request has a paymaster:
     *  - Validate paymaster has enough deposit.
     *  - Call paymaster.validatePaymasterUserOp.
     *  - Revert with proper FailedOp in case paymaster reverts.
     *  - Decrement paymaster's deposit.
     * @param opIndex                            - The operation index.
     * @param op                                 - The user operation.
     * @param opInfo                             - The operation info.
     * @param requiredPreFund                    - The required prefund amount.
     */
    function _validatePaymasterPrepayment(
        uint256 opIndex,
        PackedUserOperation calldata op,
        UserOpInfo memory opInfo,
        uint256 requiredPreFund
    ) internal returns (bytes memory context, uint256 validationData) {
        unchecked {
            uint256 preGas = gasleft();
            MemoryUserOp memory mUserOp = opInfo.mUserOp;
            address paymaster = mUserOp.paymaster;
            DepositInfo storage paymasterInfo = deposits[paymaster];
            uint256 deposit = paymasterInfo.deposit;
            if (deposit < requiredPreFund) {
                revert FailedOp(opIndex, "AA31 paymaster deposit too low");
            }
            paymasterInfo.deposit = deposit - requiredPreFund;
            uint256 pmVerificationGasLimit = mUserOp
                .paymasterVerificationGasLimit;
            try
                IPaymaster(paymaster).validatePaymasterUserOp{
                    gas: pmVerificationGasLimit
                }(op, opInfo.userOpHash, requiredPreFund)
            returns (bytes memory _context, uint256 _validationData) {
                context = _context;
                validationData = _validationData;
            } catch {
                revert FailedOpWithRevert(
                    opIndex,
                    "AA33 reverted",
                    Exec.getReturnData(REVERT_REASON_MAX_LEN)
                );
            }
            if (preGas - gasleft() > pmVerificationGasLimit) {
                revert FailedOp(
                    opIndex,
                    "AA36 over paymasterVerificationGasLimit"
                );
            }
        }
    }

    /**
     * Revert if either account validationData or paymaster validationData is expired.
     * @param opIndex                 - The operation index.
     * @param validationData          - The account validationData.
     * @param paymasterValidationData - The paymaster validationData.
     * @param expectedAggregator      - The expected aggregator.
     */
    function _validateAccountAndPaymasterValidationData(
        uint256 opIndex,
        uint256 validationData,
        uint256 paymasterValidationData,
        address expectedAggregator
    ) internal view {
        (address aggregator, bool outOfTimeRange) = _getValidationData(
            validationData
        );
        if (expectedAggregator != aggregator) {
            revert FailedOp(opIndex, "AA24 signature error");
        }
        if (outOfTimeRange) {
            revert FailedOp(opIndex, "AA22 expired or not due");
        }
        // pmAggregator is not a real signature aggregator: we don't have logic to handle it as address.
        // Non-zero address means that the paymaster fails due to some signature check (which is ok only during estimation).
        address pmAggregator;
        (pmAggregator, outOfTimeRange) = _getValidationData(
            paymasterValidationData
        );
        if (pmAggregator != address(0)) {
            revert FailedOp(opIndex, "AA34 signature error");
        }
        if (outOfTimeRange) {
            revert FailedOp(opIndex, "AA32 paymaster expired or not due");
        }
    }

    /**
     * Parse validationData into its components.
     * @param validationData - The packed validation data (sigFailed, validAfter, validUntil).
     * @return aggregator the aggregator of the validationData
     * @return outOfTimeRange true if current time is outside the time range of this validationData.
     */
    function _getValidationData(
        uint256 validationData
    ) internal view returns (address aggregator, bool outOfTimeRange) {
        if (validationData == 0) {
            return (address(0), false);
        }
        ValidationData memory data = _parseValidationData(validationData);
        // solhint-disable-next-line not-rely-on-time
        outOfTimeRange =
            block.timestamp > data.validUntil ||
            block.timestamp < data.validAfter;
        aggregator = data.aggregator;
    }

    /**
     * Validate account and paymaster (if defined) and
     * also make sure total validation doesn't exceed verificationGasLimit.
     * This method is called off-chain (simulateValidation()) and on-chain (from handleOps)
     * @param opIndex - The index of this userOp into the "opInfos" array.
     * @param userOp  - The userOp to validate.
     */
    function _validatePrepayment(
        uint256 opIndex,
        PackedUserOperation calldata userOp,
        UserOpInfo memory outOpInfo
    )
        internal
        returns (uint256 validationData, uint256 paymasterValidationData)
    {
        uint256 preGas = gasleft();
        MemoryUserOp memory mUserOp = outOpInfo.mUserOp;
        _copyUserOpToMemory(userOp, mUserOp);
        outOpInfo.userOpHash = getUserOpHash(userOp);

        // Validate all numeric values in userOp are well below 128 bit, so they can safely be added
        // and multiplied without causing overflow.
        uint256 verificationGasLimit = mUserOp.verificationGasLimit;
        uint256 maxGasValues = mUserOp.preVerificationGas |
            verificationGasLimit |
            mUserOp.callGasLimit |
            mUserOp.paymasterVerificationGasLimit |
            mUserOp.paymasterPostOpGasLimit |
            mUserOp.maxFeePerGas |
            mUserOp.maxPriorityFeePerGas;
        require(maxGasValues <= type(uint120).max, "AA94 gas values overflow");

        uint256 requiredPreFund = _getRequiredPrefund(mUserOp);
        validationData = _validateAccountPrepayment(
            opIndex,
            userOp,
            outOpInfo,
            requiredPreFund,
            verificationGasLimit
        );

        if (!_validateAndUpdateNonce(mUserOp.sender, mUserOp.nonce)) {
            revert FailedOp(opIndex, "AA25 invalid account nonce");
        }

        unchecked {
            if (preGas - gasleft() > verificationGasLimit) {
                revert FailedOp(opIndex, "AA26 over verificationGasLimit");
            }
        }

        bytes memory context;
        if (mUserOp.paymaster != address(0)) {
            (context, paymasterValidationData) = _validatePaymasterPrepayment(
                opIndex,
                userOp,
                outOpInfo,
                requiredPreFund
            );
        }
        unchecked {
            outOpInfo.prefund = requiredPreFund;
            outOpInfo.contextOffset = getOffsetOfMemoryBytes(context);
            outOpInfo.preOpGas = preGas - gasleft() + userOp.preVerificationGas;
        }
    }

    /**
     * Process post-operation, called just after the callData is executed.
     * If a paymaster is defined and its validation returned a non-empty context, its postOp is called.
     * The excess amount is refunded to the account (or paymaster - if it was used in the request).
     * @param mode      - Whether is called from innerHandleOp, or outside (postOpReverted).
     * @param opInfo    - UserOp fields and info collected during validation.
     * @param context   - The context returned in validatePaymasterUserOp.
     * @param actualGas - The gas used so far by this user operation.
     */
    function _postExecution(
        IPaymaster.PostOpMode mode,
        UserOpInfo memory opInfo,
        bytes memory context,
        uint256 actualGas
    ) private returns (uint256 actualGasCost) {
        uint256 preGas = gasleft();
        unchecked {
            address refundAddress;
            MemoryUserOp memory mUserOp = opInfo.mUserOp;
            uint256 gasPrice = getUserOpGasPrice(mUserOp);

            address paymaster = mUserOp.paymaster;
            if (paymaster == address(0)) {
                refundAddress = mUserOp.sender;
            } else {
                refundAddress = paymaster;
                if (context.length > 0) {
                    actualGasCost = actualGas * gasPrice;
                    if (mode != IPaymaster.PostOpMode.postOpReverted) {
                        try
                            IPaymaster(paymaster).postOp{
                                gas: mUserOp.paymasterPostOpGasLimit
                            }(mode, context, actualGasCost, gasPrice)
                        // solhint-disable-next-line no-empty-blocks
                        {

                        } catch {
                            bytes memory reason = Exec.getReturnData(
                                REVERT_REASON_MAX_LEN
                            );
                            revert PostOpReverted(reason);
                        }
                    }
                }
            }
            actualGas += preGas - gasleft();

            // Calculating a penalty for unused execution gas
            {
                uint256 executionGasLimit = mUserOp.callGasLimit +
                    mUserOp.paymasterPostOpGasLimit;
                uint256 executionGasUsed = actualGas - opInfo.preOpGas;
                // this check is required for the gas used within EntryPoint7683 and not covered by explicit gas limits
                if (executionGasLimit > executionGasUsed) {
                    uint256 unusedGas = executionGasLimit - executionGasUsed;
                    uint256 unusedGasPenalty = (unusedGas * PENALTY_PERCENT) /
                        100;
                    actualGas += unusedGasPenalty;
                }
            }

            actualGasCost = actualGas * gasPrice;
            uint256 prefund = opInfo.prefund;
            if (prefund < actualGasCost) {
                if (mode == IPaymaster.PostOpMode.postOpReverted) {
                    actualGasCost = prefund;
                    emitPrefundTooLow(opInfo);
                    emitUserOperationEvent(
                        opInfo,
                        false,
                        actualGasCost,
                        actualGas
                    );
                } else {
                    assembly ("memory-safe") {
                        mstore(0, INNER_REVERT_LOW_PREFUND)
                        revert(0, 32)
                    }
                }
            } else {
                uint256 refund = prefund - actualGasCost;
                _incrementDeposit(refundAddress, refund);
                bool success = mode == IPaymaster.PostOpMode.opSucceeded;
                emitUserOperationEvent(
                    opInfo,
                    success,
                    actualGasCost,
                    actualGas
                );
            }
        } // unchecked
    }

    /**
     * The gas price this UserOp agrees to pay.
     * Relayer/block builder might submit the TX with higher priorityFee, but the user should not.
     * @param mUserOp - The userOp to get the gas price from.
     */
    function getUserOpGasPrice(
        MemoryUserOp memory mUserOp
    ) internal view returns (uint256) {
        unchecked {
            uint256 maxFeePerGas = mUserOp.maxFeePerGas;
            uint256 maxPriorityFeePerGas = mUserOp.maxPriorityFeePerGas;
            if (maxFeePerGas == maxPriorityFeePerGas) {
                //legacy mode (for networks that don't support basefee opcode)
                return maxFeePerGas;
            }
            return min(maxFeePerGas, maxPriorityFeePerGas + block.basefee);
        }
    }

    /**
     * The offset of the given bytes in memory.
     * @param data - The bytes to get the offset of.
     */
    function getOffsetOfMemoryBytes(
        bytes memory data
    ) internal pure returns (uint256 offset) {
        assembly {
            offset := data
        }
    }

    /**
     * The bytes in memory at the given offset.
     * @param offset - The offset to get the bytes from.
     */
    function getMemoryBytesFromOffset(
        uint256 offset
    ) internal pure returns (bytes memory data) {
        assembly ("memory-safe") {
            data := offset
        }
    }

    /// @inheritdoc IEntryPoint
    function delegateAndRevert(address target, bytes calldata data) external {
        (bool success, bytes memory ret) = target.delegatecall(data);
        revert DelegateAndRevert(success, ret);
    }

    // ============ External 7683 Functions ============

    /**
     * @notice Opens a gasless cross-chain order on behalf of a user.
     * @dev To be called by the filler.
     * @dev This method must emit the Open event
     * @param _order The GaslessCrossChainOrder definition
     * @param _signature The user's signature over the order
     * @param _originFillerData Any filler-defined data required by the settler
     */
    function openFor(
        GaslessCrossChainOrder calldata _order,
        bytes calldata _signature,
        bytes calldata _originFillerData
    ) external virtual override {
        if (block.timestamp > _order.openDeadline) revert OrderOpenExpired();
        if (_order.originSettler != address(this))
            revert InvalidGaslessOrderSettler();
        if (_order.originChainId != _localDomain())
            revert InvalidGaslessOrderOrigin();
        (
            ResolvedCrossChainOrder memory resolvedOrder,
            bytes32 orderId,
            uint256 nonce
        ) = _resolveOrder(_order, _originFillerData);

        openOrders[orderId] = abi.encode(
            _order.orderDataType,
            _order.orderData
        );
        orderStatus[orderId] = OPENED;
        _useNonce(msg.sender, nonce);
        if (resolvedOrder.originChainId == _localDomain()) {
            _permitTransferFrom(
                resolvedOrder,
                _signature,
                _order.nonce,
                address(this)
            );
        }

        emit Open(orderId, resolvedOrder);
    }

    /**
     * @notice Opens a cross-chain order
     * @dev To be called by the user
     * @dev This method must emit the Open event
     * @param _order The OnchainCrossChainOrder definition
     */
    function open(
        OnchainCrossChainOrder calldata _order
    ) external payable virtual override {
        if (_order.originSettler != address(this))
            revert InvalidOnchainOrderSettler();
        (
            ResolvedCrossChainOrder memory resolvedOrder,
            bytes32 orderId,
            uint256 nonce
        ) = _resolveOrder(_order);
        if (resolvedOrder.originChainId != _localDomain())
            revert InvalidOrderOrigin();
        openOrders[orderId] = abi.encode(
            _order.orderDataType,
            _order.orderData
        );
        orderStatus[orderId] = OPENED;
        _useNonce(msg.sender, nonce);

        uint256 totalValue;
        for (uint256 i = 0; i < resolvedOrder.minReceived.length; i++) {
            address token = TypeCasts.bytes32ToAddress(
                resolvedOrder.minReceived[i].token
            );
            if (token == address(0)) {
                totalValue += resolvedOrder.minReceived[i].amount;
            } else {
                IERC20(token).safeTransferFrom(
                    msg.sender,
                    address(this),
                    resolvedOrder.minReceived[i].amount
                );
            }
        }

        if (msg.value != totalValue) revert InvalidNativeAmount();

        emit Open(orderId, resolvedOrder);
    }

    // ============ Internal 7683 Functions ============

    /**
     * @dev Settles multiple orders by dispatching the settlement instructions.
     * The proper status of all the orders (filled) is validated on the Base7683 before calling this function.
     * It assumes that all orders were originated in the same originDomain so it uses the the one from the first one for
     * dispatching the message, but if some order differs on the originDomain it can be re-settle later.
     * @param _orderIds The IDs of the orders to settle.
     * @param _ordersOriginData The original data of the orders.
     * @param _ordersFillerData The filler data for the orders.
     */
    function _settleOrders(
        bytes32[] calldata _orderIds,
        bytes[] memory _ordersOriginData,
        bytes[] memory _ordersFillerData
    ) internal override {
        // at this point we are sure all orders are filled, use the first order to get the originDomain
        // if some order differs on the originDomain it can be re-settle later
        _dispatchSettle(
            OrderEncoder.decode(_ordersOriginData[0]).originDomain,
            _orderIds,
            _ordersFillerData
        );
    }

    /**
     * @dev Refunds multiple OnchainCrossChain orders by dispatching refund instructions.
     * The proper status of all the orders (NOT filled and expired) is validated on the Base7683 before calling this
     * function.
     * It assumes that all orders were originated in the same originDomain so it uses the the one from the first one for
     * dispatching the message, but if some order differs on the originDomain it can be re-refunded later.
     * @param _orders The orders to refund.
     * @param _orderIds The IDs of the orders to refund.
     */
    function _refundOrders(
        OnchainCrossChainOrder[] memory _orders,
        bytes32[] memory _orderIds
    ) internal override {
        _dispatchRefund(
            OrderEncoder.decode(_orders[0].orderData).originDomain,
            _orderIds
        );
    }

    /**
     * @dev Refunds multiple GaslessCrossChain orders by dispatching refund instructions.
     * The proper status of all the orders (NOT filled and expired) is validated on the Base7683 before calling this
     * function.
     * It assumes that all orders were originated in the same originDomain so it uses the the one from the first one for
     * dispatching the message, but if some order differs on the originDomain it can be re-refunded later.
     * @param _orders The orders to refund.
     * @param _orderIds The IDs of the orders to refund.
     */
    function _refundOrders(
        GaslessCrossChainOrder[] memory _orders,
        bytes32[] memory _orderIds
    ) internal override {
        _dispatchRefund(
            OrderEncoder.decode(_orders[0].orderData).originDomain,
            _orderIds
        );
    }

    function settleWorldOrder(bytes32[] calldata _orderIds) external payable {
        bytes[] memory ordersOriginData = new bytes[](_orderIds.length);
        bytes[] memory ordersFillerData = new bytes[](_orderIds.length);
        for (uint256 i = 0; i < _orderIds.length; i += 1) {
            // all orders must be SETTLED
            if (orderStatus[_orderIds[i]] != SETTLED)
                revert InvalidOrderStatus();

            ordersOriginData[i] = filledOrders[_orderIds[i]].originData;
            ordersFillerData[i] = filledOrders[_orderIds[i]].fillerData;
            emit SettledWorld(_orderIds[i]);
        }

        _dispatchSettle(worldDomainId, _orderIds, ordersFillerData);
    }

    function refundWorldOrder(bytes32[] calldata _orderIds) external payable {
        for (uint256 i = 0; i < _orderIds.length; i += 1) {
            if (orderStatus[_orderIds[i]] != REFUNDED)
                revert InvalidOrderStatus();
            emit RefundedWorld(_orderIds[i]);
        }
        _dispatchRefund(worldDomainId, _orderIds);
    }

    /**
     * @dev Handles settling an individual order, should be called by the inheriting contract when receiving a setting
     * instruction from a remote chain.
     * @param _messageOrigin The domain from which the message originates.
     * @param _messageSender The address of the sender on the origin domain.
     * @param _orderId The ID of the order to settle.
     * @param _receiver The receiver address (encoded as bytes32).
     */
    function _handleSettleOrder(
        uint32 _messageOrigin,
        bytes32 _messageSender,
        bytes32 _orderId,
        bytes32 _receiver
    ) internal virtual {
        (bool isEligible, OrderData memory orderData) = _checkOrderEligibility(
            _messageOrigin,
            _messageSender,
            _orderId
        );

        if (!isEligible) return;

        address receiver = TypeCasts.bytes32ToAddress(_receiver);
        if (_messageOrigin == worldDomainId) {
            orderStatus[_orderId] = SETTLED_WORLD;
            emit SettledWorld(_orderId);
        } else orderStatus[_orderId] = SETTLED;

        address inputToken = TypeCasts.bytes32ToAddress(orderData.inputToken);
        _transferTokenOut(inputToken, receiver, orderData.amountIn);

        emit Settled(_orderId, receiver);
    }

    /**
     * @dev Handles refunding an individual order, should be called by the inheriting contract when receiving a
     * refunding instruction from a remote chain.
     * @param _messageOrigin The domain from which the message originates.
     * @param _messageSender The address of the sender on the origin domain.
     * @param _orderId The ID of the order to refund.
     */
    function _handleRefundOrder(
        uint32 _messageOrigin,
        bytes32 _messageSender,
        bytes32 _orderId
    ) internal virtual {
        (bool isEligible, OrderData memory orderData) = _checkOrderEligibility(
            _messageOrigin,
            _messageSender,
            _orderId
        );

        if (!isEligible) return;
        address orderSender = TypeCasts.bytes32ToAddress(orderData.sender);

        if (_messageOrigin == worldDomainId) {
            orderStatus[_orderId] = REFUNDED_WORLD;
            emit RefundedWorld(_orderId);
        } else orderStatus[_orderId] = REFUNDED;

        address inputToken = TypeCasts.bytes32ToAddress(orderData.inputToken);
        _transferTokenOut(inputToken, orderSender, orderData.amountIn);

        emit Refunded(_orderId, orderSender);
    }

    /**
     * @notice Checks if order is eligible for settlement or refund .
     * @dev Order must be OPENED and the message was sent from the appropriated chain and contract.
     * @param _messageOrigin The origin domain of the message.
     * @param _messageSender The sender identifier of the message.
     * @param _orderId The unique identifier of the order.
     * @return A boolean indicating if the order is valid, and the decoded OrderData structure.
     */
    function _checkOrderEligibility(
        uint32 _messageOrigin,
        bytes32 _messageSender,
        bytes32 _orderId
    ) internal virtual returns (bool, OrderData memory) {
        OrderData memory orderData;

        // check if the order is opened to ensure it belongs to this domain, skip otherwise
        if (orderStatus[_orderId] != OPENED) return (false, orderData);

        (, bytes memory _orderData) = abi.decode(
            openOrders[_orderId],
            (bytes32, bytes)
        );
        orderData = OrderEncoder.decode(_orderData);

        if (
            orderData.destinationDomain != _messageOrigin ||
            orderData.destinationSettler != _messageSender
        ) return (false, orderData);

        return (true, orderData);
    }

    /**
     * @notice Transfers tokens or ETH out of the contract.
     * @dev If _token is the zero address, transfers ETH using a safe method; otherwise, performs an ERC20 token
     * transfer.
     * @param _token The address of the token to transfer (use address(0) for ETH).
     * @param _to The recipient address.
     * @param _amount The amount of tokens or ETH to transfer.
     */
    function _transferTokenOut(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        if (_token == address(0)) {
            Address.sendValue(payable(_to), _amount);
        } else {
            IERC20(_token).transfer(_to, _amount);
        }
    }

    /**
     * @dev Gets the ID of a GaslessCrossChainOrder.
     * @param _order The GaslessCrossChainOrder to compute the ID for.
     * @return The computed order ID.
     */
    function _getOrderId(
        GaslessCrossChainOrder memory _order
    ) internal pure override returns (bytes32) {
        return _getOrderId(_order.orderDataType, _order.orderData);
    }

    /**
     * @dev Gets the ID of an OnchainCrossChainOrder.
     * @param _order The OnchainCrossChainOrder to compute the ID for.
     * @return The computed order ID.
     */
    function _getOrderId(
        OnchainCrossChainOrder memory _order
    ) internal pure override returns (bytes32) {
        return _getOrderId(_order.orderDataType, _order.orderData);
    }

    /**
     * @dev Computes the ID of an order given its type and data.
     * @param _orderType The type of the order.
     * @param _orderData The data of the order.
     * @return orderId The computed order ID.
     */
    function _getOrderId(
        bytes32 _orderType,
        bytes memory _orderData
    ) internal pure returns (bytes32 orderId) {
        if (_orderType != OrderEncoder.orderDataType())
            revert InvalidOrderType(_orderType);
        OrderData memory orderData = OrderEncoder.decode(_orderData);
        orderId = OrderEncoder.id(orderData);
    }

    /**
     * @dev Resolves a GaslessCrossChainOrder.
     * @param _order The GaslessCrossChainOrder to resolve.
     * NOT USED _originFillerData Any filler-defined data required by the settler
     * @return A ResolvedCrossChainOrder structure.
     * @return The order ID.
     * @return The order nonce.
     */
    function _resolveOrder(
        GaslessCrossChainOrder memory _order,
        bytes calldata
    )
        internal
        view
        virtual
        override
        returns (ResolvedCrossChainOrder memory, bytes32, uint256)
    {
        return
            _resolvedOrder(
                _order.orderDataType,
                _order.user,
                _order.openDeadline,
                _order.fillDeadline,
                _order.orderData
            );
    }

    /**
     * @notice Resolves a OnchainCrossChainOrder.
     * @param _order The OnchainCrossChainOrder to resolve.
     * @return A ResolvedCrossChainOrder structure.
     * @return The order ID.
     * @return The order nonce.
     */
    function _resolveOrder(
        OnchainCrossChainOrder memory _order
    )
        internal
        view
        virtual
        override
        returns (ResolvedCrossChainOrder memory, bytes32, uint256)
    {
        return
            _resolvedOrder(
                _order.orderDataType,
                msg.sender,
                type(uint32).max,
                _order.fillDeadline,
                _order.orderData
            );
    }

    /**
     * @dev Resolves an order into a ResolvedCrossChainOrder structure.
     * @param _orderType The type of the order.
     * @param _sender The sender of the order.
     * @param _openDeadline The open deadline of the order.
     * @param _fillDeadline The fill deadline of the order.
     * @param _orderData The data of the order.
     * @return resolvedOrder A ResolvedCrossChainOrder structure.
     * @return orderId The order ID.
     * @return nonce The order nonce.
     */
    function _resolvedOrder(
        bytes32 _orderType,
        address _sender,
        uint32 _openDeadline,
        uint32 _fillDeadline,
        bytes memory _orderData
    )
        internal
        view
        returns (
            ResolvedCrossChainOrder memory resolvedOrder,
            bytes32 orderId,
            uint256 nonce
        )
    {
        if (_orderType != OrderEncoder.orderDataType())
            revert InvalidOrderType(_orderType);

        // IDEA: _orderData should not be directly typed as OrderData, it should contain information that is not
        // present on the type used for open the order. So _fillDeadline and _user should be passed as arguments
        OrderData memory orderData = OrderEncoder.decode(_orderData);

        if (orderData.originDomain != _localDomain())
            revert InvalidOriginDomain(orderData.originDomain);

        // bytes32 destinationSettler = _mustHaveRemoteCounterpart(orderData.destinationDomain);

        // enforce fillDeadline into orderData
        orderData.fillDeadline = _fillDeadline;
        // enforce sender into orderData
        orderData.sender = TypeCasts.addressToBytes32(_sender);

        // this can be used by the filler to approve the tokens to be spent on destination
        Output[] memory maxSpent = new Output[](1);
        maxSpent[0] = Output({
            token: orderData.outputToken,
            amount: orderData.amountOut,
            recipient: orderData.destinationSettler,
            chainId: orderData.destinationDomain
        });

        // this can be used by the filler know how much it can expect to receive
        Output[] memory minReceived = new Output[](1);
        minReceived[0] = Output({
            token: orderData.inputToken,
            amount: orderData.amountIn,
            recipient: bytes32(0),
            chainId: orderData.originDomain
        });

        // this can be user by the filler to know how to fill the order
        FillInstruction[] memory fillInstructions = new FillInstruction[](1);
        fillInstructions[0] = FillInstruction({
            destinationChainId: orderData.destinationDomain,
            destinationSettler: orderData.destinationSettler,
            originData: OrderEncoder.encode(orderData)
        });

        orderId = OrderEncoder.id(orderData);

        resolvedOrder = ResolvedCrossChainOrder({
            user: _sender,
            originChainId: _localDomain(),
            openDeadline: _openDeadline,
            fillDeadline: _fillDeadline,
            orderId: orderId,
            minReceived: minReceived,
            maxSpent: maxSpent,
            fillInstructions: fillInstructions
        });

        nonce = orderData.senderNonce;
    }

    /**
     * @dev Fills an order on the current domain.
     * @param _orderId The ID of the order to fill.
     * @param _originData The origin data of the order.
     * Additional data related to the order (unused).
     */
    function _fillOrder(
        bytes32 _orderId,
        bytes calldata _originData,
        bytes calldata
    ) internal override {
        OrderData memory orderData = OrderEncoder.decode(_originData);

        if (_orderId != OrderEncoder.id(orderData)) revert InvalidOrderId();
        if (block.timestamp > orderData.fillDeadline) revert OrderFillExpired();
        if (orderData.destinationDomain != _localDomain())
            revert InvalidOrderDomain();

        address outputToken = TypeCasts.bytes32ToAddress(orderData.outputToken);
        address recipient = TypeCasts.bytes32ToAddress(orderData.recipient);

        if (outputToken == address(0)) {
            if (orderData.amountOut != msg.value) revert InvalidNativeAmount();
            Address.sendValue(payable(recipient), orderData.amountOut);
        } else {
            IERC20(outputToken).safeTransferFrom(
                msg.sender,
                recipient,
                orderData.amountOut
            );
        }
    }

    /**
     * @dev Should be implemented by the messaging layer for dispatching a settlement instruction the remote domain
     * where the orders where created.
     * @param _originDomain The origin domain of the orders.
     * @param _orderIds The IDs of the orders to settle.
     * @param _ordersFillerData The filler data for the orders.
     */
    function _dispatchSettle(
        uint32 _originDomain,
        bytes32[] memory _orderIds,
        bytes[] memory _ordersFillerData
    ) internal virtual;

    /**
     * @dev Should be implemented by the messaging layer for dispatching a refunding instruction the remote domain
     * where the orders where created.
     * @param _originDomain The origin domain of the orders.
     * @param _orderIds The IDs of the orders to refund.
     */
    function _dispatchRefund(
        uint32 _originDomain,
        bytes32[] memory _orderIds
    ) internal virtual;
}
