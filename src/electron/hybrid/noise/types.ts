
/* ---------------------------------------------------------------- *
 * TYPES                                                            *
 * ---------------------------------------------------------------- */

export interface Keypair {
    publicKey: Buffer;
    privateKey: Buffer;
};

export interface MessageBuffer {
    ne: Buffer;
    ns: Buffer;
    ciphertext: Buffer;
};

export interface CipherState {
    k: Buffer;
    n: number;
};

interface SymmetricState {
    cs: CipherState;
    ck: Buffer;
    h: Buffer;
};

interface HandshakeState {
    ss: SymmetricState;
    s: Keypair;
    e: Keypair;
    rs: Buffer;
    re: Buffer;
    psk: Buffer;
};

export interface NoiseSession {
    hs: HandshakeState;
    h: Buffer;
    cs1: CipherState;
    cs2: CipherState;
    mc: number;
    i: boolean;
};


export interface HKDF3Output {
    o1: Buffer;
    o2: Buffer;
    o3: Buffer;
}