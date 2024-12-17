/**
 * A Noise Protocol Framework implementation in TypeScript for Hybrid CTAP transport
 * 
 * Only supported schemas:
 * Noise_KNpsk0_P256_AESGCM_SHA256
 * Noise_NKpsk0_P256_AESGCM_SHA256
 * Noise_NK_P256_AESGCM_SHA256
 * 
 * https://noiseexplorer.com/patterns/NKpsk0/
 * https://noiseprotocol.org/noise.html
 * 
 * Based on the reference GO implementation
 * and Google Chrome implementation https://github.com/chromium/chromium/blob/3ea88b4b3ad399f0fa45c96894eb70dbc5477b10/device/fido/cable/noise.cc#L98
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { createCipheriv, createDecipheriv } from 'crypto';
import { HASH, HKDF3 } from './primitives.js';


/* ---------------------------------------------------------------- *
 * CONSTANTS                                                        *
 * ---------------------------------------------------------------- */


const emptyKey = Buffer.alloc(32, 0);
const minNonce = 0; // Uint64

export enum NoiseProtocolName {
    KN = 'Noise_KNpsk0_P256_AESGCM_SHA256',
    NK = 'Noise_NKpsk0_P256_AESGCM_SHA256',
    NKNoPsk = 'Noise_NK_P256_AESGCM_SHA256'
}

export const kP256X962Length = 1 + 32 + 32;


/* ---------------------------------------------------------------- *
 * PROCESS                                                          *
 * ---------------------------------------------------------------- */

export class Noise {
    chainingKey: Buffer;
    h: Buffer; // Handshake hash
    symmetricKey: Buffer;
    symmetricNonce: number;

    constructor(protocolName: NoiseProtocolName) {
        this.chainingKey = Buffer.alloc(32, 0);
        this.h = Buffer.alloc(32, 0);
        this.symmetricKey = Buffer.alloc(32, 0);
        this.symmetricNonce = 0;
        
        this.chainingKey.set(Buffer.from(protocolName))

        this.h = this.chainingKey;
    }

    mixHash(data: Buffer) {
        this.h = HASH(Buffer.concat([this.h, data]));
    }

    mixKey(ikm: Buffer) {
        const hkdf2out = HKDF3(this.chainingKey, ikm);
        this.chainingKey = hkdf2out.o1
        this.initializeKey(hkdf2out.o2);
    }

    mixKeyAndHash(ikm: Buffer) {
        const hkdf2out = HKDF3(this.chainingKey, ikm);
        this.chainingKey = hkdf2out.o1;
        this.mixHash(hkdf2out.o2);
        this.initializeKey(hkdf2out.o3);
    }
    
    initializeKey(key: Buffer) {
        if(key.length !== 32) {
            throw new Error('Invalid key length');
        }

        this.symmetricKey = key;
        this.symmetricNonce = 0;
    }

    getTrafficKeys() {
        return HKDF3(this.chainingKey, Buffer.alloc(0));
    }

    // Encryption
    encryptAndHash(plaintext: Buffer): Buffer {
        const nonce = this.getAndIncrementSymmetricNonce();

        const cipher = createCipheriv('aes-256-gcm', this.symmetricKey, nonce);
        cipher.setAAD(this.h);
        cipher.update(plaintext);

        const rawCiphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();
        const ciphertext = Buffer.concat([rawCiphertext, tag]);

        this.mixHash(ciphertext);

        return ciphertext;
    }

    decryptAndHash(ciphertext: Buffer): Buffer | null {
        const nonce = this.getAndIncrementSymmetricNonce();
        const decipher = createDecipheriv('aes-256-gcm', this.symmetricKey, nonce);

        decipher.setAAD(this.h); // Set the associated data (AAD)

        // Extract the authentication tag from the end of the ciphertext
        const tag = ciphertext.subarray(ciphertext.length - 16);
        const encryptedData = ciphertext.subarray(0, ciphertext.length - 16);

        decipher.setAuthTag(tag);

        try {
            // Decrypt the ciphertext
            const plaintext = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

            // Mix the hash with the ciphertext
            this.mixHash(ciphertext);

            return plaintext;
        } catch (err) {
            // If decryption fails, return null
            return null;
        }
    }

    mixHashPoint(x962Point: Buffer) {
        if(x962Point.length !== kP256X962Length) {
            throw new Error('Invalid x962Point length');
        }

        this.mixHash(x962Point);
    }

    // Utility
    getAndIncrementSymmetricNonce(): Buffer {
        let nonce = Buffer.alloc(12);
        nonce.writeUint32BE(this.symmetricNonce);
        this.symmetricNonce++;

        return nonce;
    }

    // Static
    get handshakeHash(): Buffer {
        return this.h;
    }
}