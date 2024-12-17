/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

export interface AuthTokenRequestInit {
    handshakeHashHex: string;
    os: string;
}

export interface AuthTokenResult {
    token: string;
}