import { createHash, hkdfSync } from "crypto";
import { HKDF3Output } from "./types.js";

export const HKDF3 = (ck: Buffer, ikm: Buffer): HKDF3Output => {
    const hmac = Buffer.from(hkdfSync('sha256', ikm, ck, Buffer.alloc(0), 32*3));

    return {
        o1: hmac.subarray(0, 32),
        o2: hmac.subarray(32, 64),
        o3: hmac.subarray(64, 96)
    }
}

export const HASH = (data: Buffer): Buffer => {
    return Buffer.from(createHash('sha256').update(data).digest());
}

