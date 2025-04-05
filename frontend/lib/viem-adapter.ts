import {
  type Account,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type SignableMessage,
  type Transport,
  type TransactionSerializable,
  type SerializeTransactionFn,
} from "viem";
import { MiniKit, SignTypedDataInput } from "@worldcoin/minikit-js";

/**
 * Creates a viem Account from a MiniKit wallet instance
 */
export function viemAdapter(): Account {
  if (!MiniKit.user?.walletAddress) {
    throw new Error("MiniKit user or wallet address not available");
  }

  return {
    // Required by viem Account interface
    address: MiniKit.user.walletAddress as Address,
    type: "local",
    publicKey: "0x" as Hex, // If MiniKit doesn't expose this, use a placeholder
    source: "minikit", // Source identifier

    // Sign a transaction
    async signTransaction(transaction, _args) {
      console.log("Transaction to sign:", transaction);

      // Implement the actual signing logic here
      // For example:
      const { finalPayload, commandPayload } =
        await MiniKit.commandsAsync.sendTransaction({
          transaction: transaction as any, // Convert to MiniKit's expected format
        });
      if (finalPayload.status === "success") {
        return finalPayload.transaction_id as Hex;
      } else {
        throw new Error("Failed to sign transaction");
      }

      // Temporary placeholder return for development
      // return "0xHello" as Hex;
    },

    // Sign a message
    async signMessage({ message }) {
      const messageToSign =
        typeof message === "string"
          ? message
          : message instanceof Uint8Array
          ? new TextDecoder().decode(message)
          : message.raw;

      const { finalPayload } = await MiniKit.commandsAsync.signMessage({
        message: messageToSign, // Fixed: use the actual message
      });

      if (finalPayload.status === "success") {
        return finalPayload.signature as Hex;
      } else {
        throw new Error("Failed to sign message");
      }
    },

    // Sign typed data (EIP-712)
    async signTypedData(typedData) {
      const { finalPayload } = await MiniKit.commandsAsync.signTypedData(
        typedData as SignTypedDataInput
      );

      if (finalPayload.status === "success") {
        return finalPayload.signature as Hex;
      } else {
        throw new Error("Failed to sign typed data");
      }
    },

    // Implementation of sign method for raw hash signing
    async sign({ hash }) {
      // If MiniKit provides a way to sign raw hashes:
      const { finalPayload } = await MiniKit.commandsAsync.signMessage({
        message: hash, // Using message signing as a fallback
      });

      if (finalPayload.status === "success") {
        return finalPayload.signature as Hex;
      } else {
        throw new Error("Failed to sign hash");
      }
    },
  };
}
