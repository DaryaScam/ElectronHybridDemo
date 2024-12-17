/**
 * 
 * All functions related to encryption and decryption of the hybrid service data
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { createDecipheriv, createHmac, hkdfSync } from 'crypto';
import { SessionIK } from './hybrid.js';

export const EIK_KEY_PURPOSE = {
    EIDkey: 0x01,
    Tunnel: 0x02,
    PSK: 0x03,
}

const numberToUint32LE = (num: number): Buffer => {
    let buf = Buffer.alloc(4);
    buf.writeUInt32LE(num);
    return buf;
}

export interface HybridServiceDataResult {
    flags: number;
    connectionNonce: Buffer;
    routingId: Buffer;
    tunnelServiceId: Buffer;
    tunnelServiceIdInt: number;
}

export const hybridHKDFDerive = (secret: Buffer, purpose: number, length: number): Buffer => {
    return Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), numberToUint32LE(purpose), length));
}

export const tryDecryptPayload = (payload: Buffer, sessionIK: SessionIK): HybridServiceDataResult => {
    let eik = hybridHKDFDerive(sessionIK.qrSecret, EIK_KEY_PURPOSE.EIDkey, 64);

    let encryptKey = eik.subarray(0, 32);
    let macKey = eik.subarray(32);

    let encrypted = payload.subarray(0, 16);
    let tag = payload.subarray(16);

    // Checking tag
    let hmacChecksum = createHmac('sha256', macKey).update(encrypted).digest();

    let newTag = hmacChecksum.subarray(0, 4);
    if (!newTag.equals(tag)) {
        throw new Error('Tag mismatch');
    }

    let decrypted = Buffer.alloc(16);
    let cipher = createDecipheriv('aes-256-ecb', encryptKey, null);
    cipher.setAutoPadding(false);
    cipher.update(encrypted).copy(decrypted);

    let flags = decrypted[0];
    if (flags !== 0x00) {
        throw new Error('Invalid hybrid flags');
    }

    let connectionNonce = decrypted.subarray(1, 11);
    let routingId = decrypted.subarray(11, 14);
    let tunnelServiceId = decrypted.subarray(14);
    let tunnelServiceIdInt = decrypted.subarray(14).readUint16LE();

    return {
        flags,
        connectionNonce,
        routingId,
        tunnelServiceId,
        tunnelServiceIdInt
    }
} 