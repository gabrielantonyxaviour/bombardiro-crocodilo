import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { createPublicClient, http, zeroAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  getUserOperationGasPrice,
} from "@zerodev/sdk";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const entryPoint = getEntryPoint("0.7");
  const kernelVersion = KERNEL_V3_1;
  const publicClient = createPublicClient({
    // In production, you will want to set your RPC provider here (e.g. Infura/Alchemy).
    transport: http(),
    chain: baseSepolia,
  });
  const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion,
  });

  const nullifierHash = BigInt("23124132423141231");
  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion,
    index: nullifierHash,
  });

  const zerodevPaymaster = createZeroDevPaymasterClient({
    chain: baseSepolia,
    transport: http(process.env.PAYMASTER_RPC as string),
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain: baseSepolia,
    bundlerTransport: http(process.env.BUNDLER_URL as string),
    client: publicClient,
    paymaster: {
      getPaymasterData(userOperation) {
        return zerodevPaymaster.sponsorUserOperation({ userOperation });
      },
    },
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) => {
        return getUserOperationGasPrice(bundlerClient);
      },
    },
  });

  const accountAddress = kernelClient.account.address;
  console.log("My account:", accountAddress);
  const userOpHash = await kernelClient.sendUserOperation({
    callData: await kernelClient.account.encodeCalls([
      {
        to: zeroAddress,
        value: BigInt(0),
        data: "0x",
      },
    ]),
  });

  console.log("UserOp hash:", userOpHash);
  console.log("Waiting for UserOp to complete...");

  await kernelClient.waitForUserOperationReceipt({
    hash: userOpHash,
    timeout: 1000 * 15,
  });

  console.log(
    "UserOp completed: https://base-sepolia.blockscout.com/op/" + userOpHash
  );
}

main();
