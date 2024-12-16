import { kP256X962Length, Noise, NoiseProtocolName } from '../noise/noise.js';
import { HKDF3Output } from '../noise/types.js';
import { EcdhKeyPair } from './hybrid.js';

interface CaBLEInitialMessage {
    msg: Buffer;
    ephermeralKey: EcdhKeyPair;
}

interface CaBLEHandshakeResult {
    trafficKeys: HKDF3Output;
    handshakeHash: Buffer;
}


export class CaBLEv2 {
    ns: Noise | null = null;
  
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

    async processHandshakeResponse(peerHandshakeMessage: Buffer, ephermeralKey: EcdhKeyPair, identityKey: EcdhKeyPair | null): Promise<CaBLEHandshakeResult> {
        if(!this.ns) {
            throw new Error('Noise was not initialised');
        }

        if(peerHandshakeMessage.length < kP256X962Length) {
            throw new Error('Handshake is too short');
        }

        const peerPointBytes = peerHandshakeMessage.subarray(0, kP256X962Length)
        const ciphertext = peerHandshakeMessage.subarray(kP256X962Length)

        this.ns?.mixHash(peerPointBytes)
        this.ns?.mixKey(peerPointBytes);
        this.ns?.mixKey(ephermeralKey.deriveSecret(peerPointBytes));

        if(identityKey != null) {
            this.ns?.mixKey(identityKey.deriveSecret(peerPointBytes));
        }

        const plaintext = this.ns.decryptAndHash(ciphertext)
        if(!plaintext || plaintext.length == 0) {
            throw new Error('Failed to decrypt handshake message');
        }

        return {
            trafficKeys: this.ns.getTrafficKeys(),
            handshakeHash: this.ns.handshakeHash
        }
    }


    async respondToHandshake() {
        
    }
}