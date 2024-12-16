/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { createECDH, ECDH } from 'crypto'
import { digitEncodeQRBytes, generateRandomBytes } from './utils.js'
import cbor from 'cbor'

const HYBRID_MODES = {
    GET_ASSERTION: 'ga',
    MAKE_CREDENTIAL: 'mc',
    DEVICE_CREDENTIAL_PRESENTATION: 'dcp',
    DEVICE_CREDENTIAL_ISSUANCE: 'dci',
    NON_STANDARD_TOKEN: 'nst'
}

export class EcdhKeyPair {
    privateKey: Buffer
    ecdh: ECDH
    constructor(privateKey: Buffer | null | undefined = undefined) {
        this.ecdh = createECDH('prime256v1')
        if(privateKey) {
            this.ecdh.setPrivateKey(privateKey)
            this.privateKey = privateKey
        } else {
            this.ecdh.generateKeys()
            this.privateKey = this.ecdh.getPrivateKey()
        }
    }

    get x962Key(): Buffer {
        return this.ecdh.getPublicKey(null, 'uncompressed')
    }

    get compressed(): Buffer {
        return this.ecdh.getPublicKey(null, 'compressed')
    }

    deriveSecret(publicKey: Buffer): Buffer {
        return this.ecdh.computeSecret(publicKey)
    }
}

export interface SessionIK {
    qrSecret: Buffer
    identityKey: EcdhKeyPair
}

export const generateSessionIK = (): SessionIK => {
    return {
        qrSecret: generateRandomBytes(16),
        identityKey: new EcdhKeyPair(),
    }
}

export const generateQRCodeVal = (sessionIK: SessionIK): string => {
    console.log(sessionIK.identityKey.x962Key)
    let resultMap = new Map<number, any>()
    resultMap.set(0, sessionIK.identityKey.compressed) // a 33-byte, P-256, X9.62, compressed public key
    resultMap.set(1, sessionIK.qrSecret) // a 16-byte random qr secret
    resultMap.set(2, 0x01) // TODO number of assigned tunnel server domains
    resultMap.set(3, Math.floor(new Date().getTime() / 1000) ) // timestamp in epoch seconds.
    resultMap.set(4, false) // TODO a boolean that is true if the device displaying the QR code can perform state-assisted transactions.
    resultMap.set(5, HYBRID_MODES.NON_STANDARD_TOKEN)

    const cborBytes = cbor.encode(resultMap);

    return digitEncodeQRBytes(cborBytes)
}
