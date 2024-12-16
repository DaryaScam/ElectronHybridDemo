/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { createHash } from 'crypto';
import { EIK_KEY_PURPOSE, hybridHKDFDerive, HybridServiceDataResult } from './crypto.js';
import { SessionIK } from './hybrid.js';
import { WebSocket } from 'ws';


// Assigned by FIDO Alliance CaBLE domains
const assignedDomains = [
    'cable.ua5v.com',
    'cable.auth.com'
];

const bigIntToBase32 = (biNum: bigint) => {
    const base32 = 'abcdefghijklmnopqrstuvwxyz234567';
    let result = '';
    while (biNum > 0n) {
        result += base32[Number(biNum & 31n)];
        biNum >>= 5n;
    }
    return result;
}

const allowedTlds = ['.com', '.org', '.net', '.info']
const hashPrefix = 'caBLEv2 tunnel server domain';
const domainPrefix = 'cable.'

export const calculateHybridTunnelDomain = (index: number) => {
    const indexBytes = Buffer.from([index, index >> 8, 0x00]);

    // Data
    const data = Buffer.alloc(hashPrefix.length + 3);
    data.set(hashPrefix.split('').map(c => c.charCodeAt(0)), 0);
    data.set(indexBytes, hashPrefix.length);

    // Hash
    const hashBuffer = createHash('sha256').update(data).digest();

    // Digest slice
    const digest = hashBuffer.subarray(0, 8);
    const digestBigInt = digest.readBigUint64LE();

    // Base32 encode
    const tldIndex = Number(digestBigInt & 3n);
    const domain = bigIntToBase32(digestBigInt>>2n);

    const tld = allowedTlds[tldIndex&3];

    return domainPrefix + domain + tld;
}

export class HybridTunnel {
    wsslink: string;
    tunnelServiceInfo: HybridServiceDataResult;
    sessionIK: SessionIK;
    ws: WebSocket;

    listenCallbacks: ((event: Buffer) => void)[] = [];
    open: boolean = false;

    constructor(tunnelServiceInfo: HybridServiceDataResult, sessionIK: SessionIK) {
        this.tunnelServiceInfo = tunnelServiceInfo;
        this.sessionIK = sessionIK;

        const tunnelServerDomain = calculateHybridTunnelDomain(tunnelServiceInfo.tunnelServiceIdInt);
        const routingIdHex = tunnelServiceInfo.routingId.toString('hex');
        const tunnelIDHex = hybridHKDFDerive(sessionIK.qrSecret, EIK_KEY_PURPOSE.Tunnel, 16).toString('hex');


        this.wsslink = `wss://${tunnelServerDomain}/cable/connect/${routingIdHex}/${tunnelIDHex}`;

        console.log(this.wsslink)

        this.ws = new WebSocket(this.wsslink);
   
        this.ws.onmessage = (event) => {
            console.log('WebSocket received', event.data);
      
            this.listenCallbacks.forEach((callback) => {
                callback(event.data as Buffer);
            });
        }
    
        this.ws.onopen = (event) => {
            console.log('WebSocket connected', event);
        
            this.open = true;
        }
    }
    
    checkConnected() {
        if (!this.open) {
            throw new Error('WebSocket not connected');
        }
    }
    
    async waitConnected(timeout: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
        
                reject(new Error('Timeout'));
            }, timeout);
    
            const checkInterval = setInterval(() => {
                if (this.open) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 300);
        });
    }
    
    listen(callback: (message: Buffer) => void) {
        this.checkConnected();

        this.listenCallbacks.push(callback);
    }
    
    removeListener(callback: (message: Buffer) => void) {
        this.checkConnected();
    
        this.listenCallbacks = this.listenCallbacks.filter((cb) => cb !== callback);
    }
    
    
    async awaitMessage(timeout: number = 30 * 1000): Promise<Buffer> {
        this.checkConnected();
      
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout'));
            }, timeout);
      
            let listener = (data: Buffer) => {
                clearTimeout(timeoutId);
                resolve(data);
                this.removeListener(listener);
            }
            this.listen(listener);
        });
    }
    
    sendMessage(message: Buffer) {
        this.checkConnected();
        
        console.log('WebSocket send', message.toString('hex'));
        this.ws.send(message);
    }
      
    close() {
        this.ws.close();
    }
}