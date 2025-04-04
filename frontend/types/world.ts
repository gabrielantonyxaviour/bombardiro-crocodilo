import { VerificationLevel } from "@worldcoin/minikit-js"

export type VerifyCommandInput = {
    action: string
    signal?: string
    verification_level?: VerificationLevel // Default: Orb
}

export type MiniAppVerifyActionSuccessPayload = {
    status: 'success'
    proof: string
    merkle_root: string
    nullifier_hash: string
    verification_level: VerificationLevel
    version: number
}

export interface WalletAuthInput {
    nonce: string
    expirationTime?: Date
    statement?: string
    requestId?: string
    notBefore?: Date
}

export type MiniAppWalletAuthSuccessPayload = {
    status: 'success'
    message: string
    signature: string
    address: string
    version: number
}

export type Permit2 = {
    permitted: {
        token: string
        amount: string | unknown
    }
    spender: string
    nonce: string | unknown
    deadline: string | unknown
}

