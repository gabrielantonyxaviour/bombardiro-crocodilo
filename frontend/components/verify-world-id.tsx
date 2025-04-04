'use client'
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'
import { Button } from './ui/button'
import { useState } from 'react'


export async function VerifyWorldId() {
    const [verified, setVerified] = useState(false)

    const verifyPayload: VerifyCommandInput = {
        action: 'test', // This is your action ID from the Developer Portal
        verification_level: VerificationLevel.Device, // Orb | Device
    }

    const handleVerify = async () => {
        if (!MiniKit.isInstalled()) {
            console.error('MiniKit is not installed')
            return
        }
        console.log('Verifying World ID')
        // World App will open a drawer prompting the user to confirm the operation, promise is resolved once user confirms or cancels
        const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
        if (finalPayload.status === 'error') {
            return console.log('Error payload', finalPayload)
        }

        // Verify the proof in the backend
        const verifyResponse = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payload: finalPayload as ISuccessResult, // Parses only the fields we need to verify
                action: 'test',
            }),
        })

        const { success } = await verifyResponse.json()
        if (success) {
            console.log('Verification success!')
            setVerified(true)
        }
    }

    return !verified ? <Button onClick={handleVerify}>Verify World ID</Button> : <p>Verified!</p>
}