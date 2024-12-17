export interface AuthTokenRequestInit {
    handshakeHashHex: string;
    os: string;
}

export interface AuthTokenResult {
    token: string;
}