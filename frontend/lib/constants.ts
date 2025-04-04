export const chainImageMapping: Record<number, string> = {
  1: "/chains/eth.svg",
  11155111: "/chains/eth.svg",
  43114: "/chains/avax.svg",
  43113: "/chains/avax.svg",
  42161: "/chains/arb.png",
  421614: "/chains/arb.png",
  8453: "/chains/base.png",
  84532: "/chains/base.png",
  480: "/chains/world.png",
  4801: "/chains/world.png",
  137: "/chains/pol.png",
  80002: "/chains/pol.png",
  10: "/chains/op.png",
  11155420: "/chains/op.png",
};

export const assetImageMapping: Record<string, string> = {
  eth: "/chains/eth.svg",
  base: "/chains/base.png",
  avax: "/chains/avax.svg",
  wld: "/chains/world.png",
  arb: "/chains/arb.png",
  usdc: "/assets/usdc.png",
  usdt: "/assets/usdt.png",
  dai: "/assets/dai.png",
  pol: "/chains/pol.png",
  op: "/chains/op.png",
};

export const WORLD_TESTING_ABI = [
  {
    inputs: [
      {
        internalType: "contract IWorldID",
        name: "_worldId",
        type: "address",
      },
      {
        internalType: "string",
        name: "_appId",
        type: "string",
      },
      {
        internalType: "string",
        name: "_actionId",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nullifierHash",
        type: "uint256",
      },
    ],
    name: "DuplicateNullifier",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "nullifierHash",
        type: "uint256",
      },
    ],
    name: "Verified",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "signal",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "root",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "nullifierHash",
        type: "uint256",
      },
      {
        internalType: "uint256[8]",
        name: "proof",
        type: "uint256[8]",
      },
    ],
    name: "verifyAndExecute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
