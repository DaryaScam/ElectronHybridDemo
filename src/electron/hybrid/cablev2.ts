/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { createCipheriv, createDecipheriv } from 'crypto';
import { kP256X962Length, Noise, NoiseProtocolName } from './noise/noise.js';
import { EcdhKeyPair } from './hybrid.js';

interface CaBLEInitialMessage {
    msg: Buffer;
    ephermeralKey: EcdhKeyPair;
}

interface CaBLEHandshakeResult {
    handshakeHash: Buffer;
}

interface AEADSetupResult {
    nonce: Buffer;
}

const paddingGranularity = 32;
const mib = 1024 * 1024;

export class CaBLEv2 {
    ns: Noise | null = null;

    clientToPlatformKey: Buffer | null = null;
    platformToClientKey: Buffer | null = null;
    clientToPlatformSEQ: number = 0;
    platformToClientSEQ: number = 0;
  
    // Private key must be Priv + Pub
    async initialConnectMessage(psk: Buffer | null, privateKey: EcdhKeyPair | null): Promise<CaBLEInitialMessage> {
        // if ((privateKey === null) && (peerPub === null)) {
        //     throw new Error('Invalid private key or peer public key');
        // }

        // if ((psk === null) && (peerPub === null)) {
        //     throw new Error('Invalid must have psk or private key');
        // }

        let prologue = 0x00
        // if (!psk) {
        //     this.ns = new Noise(NoiseProtocolName.NKNoPsk);
        //     prologue = 0x00;
        //     this.ns.mixHash(Buffer.from([prologue]));
        //     this.ns.mixHashPoint(peerPub!);
        // } else if(peerPub != null) {
        //     this.ns = new Noise(NoiseProtocolName.NK);
        //     prologue = 0x00
        //     this.ns.mixHash(Buffer.from([prologue]));
        //     this.ns.mixHash(peerPub!);
        //     this.ns.mixKeyAndHash(psk!);
        // } else {
        this.ns = new Noise(NoiseProtocolName.KN);
        prologue = 0x01;
        this.ns.mixHash(Buffer.from([prologue]));
        this.ns.mixHashPoint(privateKey!.x962Key);
        this.ns.mixKeyAndHash(psk!);
        // }

        const ephemeral = new EcdhKeyPair(); //es

        this.ns.mixHash(ephemeral.x962Key);
        this.ns.mixKey(ephemeral.x962Key);

        // if (peerPub) { // TODO: Maybe future
        //     this.ns.mixKey(ephemeral.deriveSecret(peerPub));
        // }

        return {
            msg: Buffer.concat([ephemeral.x962Key, this.ns.encryptAndHash(Buffer.alloc(0))]),
            ephermeralKey: ephemeral,
        }
    }

    async processHandshakeResponse(peerHandshakeAck: Buffer, ephermeralKey: EcdhKeyPair): Promise<CaBLEHandshakeResult> {
        if(!this.ns) {
            throw new Error('Noise was not initialised');
        }

        if(peerHandshakeAck.length < kP256X962Length) {
            throw new Error('Handshake is too short');
        }

        const peerPointBytes = peerHandshakeAck.subarray(0, kP256X962Length)
        const ciphertext = peerHandshakeAck.subarray(kP256X962Length)

        this.ns?.mixHash(peerPointBytes)
        this.ns?.mixKey(peerPointBytes);
        this.ns?.mixKey(ephermeralKey.deriveSecret(peerPointBytes));

        // if(identityKey != null) {
        //     this.ns?.mixKey(identityKey.deriveSecret(peerPointBytes));
        // }

        const plaintext = this.ns.decryptAndHash(ciphertext)
        if(!plaintext || plaintext.length == 0) {
            throw new Error('Failed to decrypt handshake message');
        }

        let trafficKeys = this.ns.getTrafficKeys();
        this.clientToPlatformKey = trafficKeys.o1;
        this.platformToClientKey = trafficKeys.o2;
        

        return {
            handshakeHash: this.ns.handshakeHash
        }
    }


    // ENC
    getAEADNonce(seq: number): Buffer {
        let nonce = Buffer.alloc(12);
        nonce.writeUInt32BE(seq, 0);
        return nonce;
    }

    decryptFromClient(ciphertext: Buffer): Buffer {
        if(!this.clientToPlatformKey) {
            throw new Error('Client to platform key is not set');
        }

        let nonce = this.getAEADNonce(this.clientToPlatformSEQ);
        this.clientToPlatformSEQ++;

        const decipher = createDecipheriv('aes-256-gcm', this.clientToPlatformKey, nonce);
        decipher.setAAD(Buffer.alloc(0));

        const tag = ciphertext.subarray(ciphertext.length - 16);
        const encryptedData = ciphertext.subarray(0, ciphertext.length - 16);
        decipher.setAuthTag(tag);

        try {
            let rawPlaintext = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
            let paddingLen = rawPlaintext[rawPlaintext.length - 1];
            if (paddingLen + 1 > rawPlaintext.length) {
                throw new Error('Invalid padding length');
            }

            return rawPlaintext.subarray(0, rawPlaintext.length - paddingLen - 1);
        } catch (err) {
            throw new Error('Failed to decrypt. ' + err);
        }
    }

    encryptForClient(plaintext: Buffer): Buffer {
        if(!this.platformToClientKey) {
            throw new Error('Platform to client key is not set');
        }

        if (plaintext.length > mib) {
            throw new Error('Message is too long');
        }

        const extraBytes = paddingGranularity - (plaintext.length % paddingGranularity)

        const paddedPlaintext = Buffer.concat([plaintext, Buffer.alloc(extraBytes, 0x00)]);
        paddedPlaintext[paddedPlaintext.length - 1] = extraBytes - 1;

        let nonce = this.getAEADNonce(this.platformToClientSEQ);
        this.platformToClientSEQ++;

        const cipher = createCipheriv('aes-256-gcm', this.platformToClientKey, nonce);
        cipher.setAAD(Buffer.alloc(0));

        const rawCiphertext = Buffer.concat([cipher.update(paddedPlaintext), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([rawCiphertext, tag]);
    }

}