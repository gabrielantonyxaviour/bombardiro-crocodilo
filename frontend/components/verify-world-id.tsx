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

export async function VerifyWorldId() {
  const [verified, setVerified] = useState(false);
  const [signal, setSignal] = useState<string>("");

  useEffect(() => {
    console.log("MiniKit is installed", MiniKit.isInstalled());
    if (MiniKit.isInstalled()) {
      const signal = MiniKit.user?.walletAddress;
      if (signal) {
        setSignal(signal);
      }
    }
  }, [MiniKit.user]);

  const verifyPayload: VerifyCommandInput = {
    action: "onboarding",
    verification_level: VerificationLevel.Orb,
  };

  const handleVerify = async () => {
    if (!MiniKit.isInstalled()) {
      console.error("MiniKit is not installed");
      return;
    }
    console.log("Verifying World ID");
    const { finalPayload } = await MiniKit.commandsAsync.verify({
      ...verifyPayload,
      signal,
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
        signal, // This is the signal we passed in the verify command
      }),
    });

    const { commandPayload, finalPayload: finalVerifyTxPayload } =
      await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: "0x5E8fbDE101292eeCd9317c32A6b960723100e4D8",
            abi: WORLD_TESTING_ABI,
            functionName: "verifyAndExecute",
            args: [
              signal,
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
    <Button onClick={handleVerify}>{MiniKit.user?.walletAddress}</Button>
  ) : (
    <p>Verified!</p>
  );
}
