// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ByteHasher} from "./helpers/ByteHasher.sol";
import {IWorldID} from "./interfaces/IWorldID.sol";

import {StringUtils} from "@ensdomains/ens-contracts/contracts/utils/StringUtils.sol";

import {IL2Registrar} from "./interfaces/IL2Registrar.sol";
import {IL2Registry} from "./interfaces/IL2Registry.sol";

/// @dev This is an example registrar contract that is mean to be modified.
contract FrankyENSRegistrar is IL2Registrar {
    using StringUtils for string;

    using ByteHasher for bytes;
    error DuplicateNullifier(uint256 nullifierHash);

    /// @dev The World ID instance that will be used for verifying proofs
    IWorldID internal immutable worldId;

    /// @dev The contract's external nullifier hash
    uint256 internal immutable externalNullifier;

    /// @dev The World ID group ID (always 1)
    uint256 internal immutable groupId = 1;

    /// @notice The chainId for the current chain
    uint256 public chainId;

    /// @notice The coinType for the current chain (ENSIP-11)
    uint256 public immutable coinType;

    /// @notice The L2Registry contract
    IL2Registry private immutable _registry;

    address public immutable owner;

    /// @dev Whether a nullifier hash has been used already. Used to guarantee an action is only performed once by a single person
    mapping(uint256 => bool) internal nullifierHashes;

    /// @notice Emitted when a new name is registered
    /// @param label The registered label (e.g. "name" in "name.eth")
    /// @param owner The owner of the newly registered name
    event NameRegistered(string indexed label, address indexed owner);

    /// @param nullifierHash The nullifier hash for the verified proof
    /// @dev A placeholder event that is emitted when a user successfully verifies with World ID
    event Verified(uint256 nullifierHash);

    error DisabledFunction();

    /// @notice Initializes the registrar with a registry contract and World ID instance
    /// @param _worldId The WorldID router that will verify the proofs
    /// @param _appId The World ID app ID
    /// @param _actionId The World ID action ID
    /// @param _inputRegistry Address of the L2Registry contract
    /// @param _owner The owner of this contract
    constructor(
        IWorldID _worldId,
        string memory _appId,
        string memory _actionId,
        address _inputRegistry,
        address _owner
    ) {
        assembly {
            sstore(chainId.slot, chainid())
        }
        coinType = (0x80000000 | chainId) >> 0;
        _registry = IL2Registry(_inputRegistry);
        worldId = _worldId;
        externalNullifier = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _actionId)
            .hashToField();
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function register(string calldata label, address owner) external {
        revert DisabledFunction();
    }

    function registerWithProof(
        string calldata label,
        address owner,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external onlyOwner {
        _verifyAndExecute(owner, root, nullifierHash, proof);
        _register(label, owner);
    }

    function _register(string calldata label, address owner) internal {
        bytes32 node = _labelToNode(label);
        bytes memory addr = abi.encodePacked(owner); // Convert address to bytes

        _registry.setAddr(node, coinType, addr);

        _registry.setAddr(node, 60, addr);

        _registry.createSubnode(
            _registry.baseNode(),
            label,
            owner,
            new bytes[](0)
        );
        emit NameRegistered(label, owner);
    }

    function available(string calldata label) external view returns (bool) {
        bytes32 node = _labelToNode(label);
        uint256 tokenId = uint256(node);

        try _registry.ownerOf(tokenId) {
            return false;
        } catch {
            if (label.strlen() >= 3) {
                return true;
            }
            return false;
        }
    }

    function _labelToNode(
        string calldata label
    ) private view returns (bytes32) {
        return _registry.makeNode(_registry.baseNode(), label);
    }

    function registry() external view returns (IL2Registry) {
        return _registry;
    }

    /// @param signal An arbitrary input from the user, usually the user's wallet address (check README for further details)
    /// @param root The root of the Merkle tree (returned by the JS widget).
    /// @param nullifierHash The nullifier hash for this proof, preventing double signaling (returned by the JS widget).
    /// @param proof The zero-knowledge proof that demonstrates the claimer is registered with World ID (returned by the JS widget).
    /// @dev Feel free to rename this method however you want! We've used `claim`, `verify` or `execute` in the past.
    function _verifyAndExecute(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) internal {
        // First, we make sure this person hasn't done this before
        if (nullifierHashes[nullifierHash])
            revert DuplicateNullifier(nullifierHash);

        // We now verify the provided proof is valid and the user is verified by World ID
        worldId.verifyProof(
            root,
            groupId,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifier,
            proof
        );

        // We now record the user has done this, so they can't do it again (proof of uniqueness)
        nullifierHashes[nullifierHash] = true;

        // Finally, execute your logic here, for example issue a token, NFT, etc...
        // Make sure to emit some kind of event afterwards!

        emit Verified(nullifierHash);
    }
}
