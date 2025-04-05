"use client";
import {
  MiniKit,
  VerifyCommandInput,
  VerificationLevel,
  ISuccessResult,
} from "@worldcoin/minikit-js";
import { Button } from "./ui/button";
import { use, useEffect, useState } from "react";
import { WORLD_TESTING_ABI } from "@/lib/constants";
import { decodeAbiParameters } from "viem";
import { useEnvironmentStore } from "./providers/context";

export async function VerifyWorldId() {
  const [verified, setVerified] = useState(false);
  const { worldAddress } = useEnvironmentStore((store) => store);

  const handleVerify = async () => {
    if (!worldAddress) {
      console.error("World address is not set");
      return;
    }
    if (!MiniKit.isInstalled()) {
      console.error("MiniKit is not installed");
      return;
    }
    console.log("Verifying World ID");

    const verifyPayload: VerifyCommandInput = {
      action: "onboarding",
      verification_level: VerificationLevel.Orb,
    };
    const { finalPayload } = await MiniKit.commandsAsync.verify({
      ...verifyPayload,
      signal: worldAddress,
    });
    if (finalPayload.status === "error") {
      return console.log("Error payload", finalPayload);
    }
    console.log("Final payload", finalPayload);
    // Verify the proof in the backend
    const verifyResponse = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: finalPayload as ISuccessResult, // Parses only the fields we need to verify
        action: "onboarding",
        signal: worldAddress,
        params: [
          worldAddress,
          finalPayload.merkle_root,
          finalPayload.nullifier_hash,
          decodeAbiParameters(
            [{ type: "uint256[8]" }],
            finalPayload.proof as `0x${string}`
          )[0].map((x) => x.toString()),
        ],
      }),
    });
    console.log("Transaction Payload");
    console.log({
      transaction: [
        {
          address: "0xFab019C029e08B51c1A1661007dbeCfe23065c71",
          abi: WORLD_TESTING_ABI,
          functionName: "verifyAndExecute",
          args: [
            worldAddress,
            finalPayload.merkle_root,
            finalPayload.nullifier_hash,
            decodeAbiParameters(
              [{ type: "uint256[8]" }],
              finalPayload.proof as `0x${string}`
            )[0],
          ],
        },
      ],
    });
    const { commandPayload, finalPayload: finalVerifyTxPayload } =
      await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: "0xFab019C029e08B51c1A1661007dbeCfe23065c71",
            abi: WORLD_TESTING_ABI,
            functionName: "verifyAndExecute",
            args: [
              worldAddress,
              finalPayload.merkle_root,
              finalPayload.nullifier_hash,
              decodeAbiParameters(
                [{ type: "uint256[8]" }],
                finalPayload.proof as `0x${string}`
              )[0],
            ],
          },
        ],
      });

    console.log("Command payload", commandPayload);
    console.log("Final payload", finalVerifyTxPayload);
  };

  return !verified ? (
    <Button onClick={handleVerify}>Verify World ID</Button>
  ) : (
    <p>Verified!</p>
  );
}
