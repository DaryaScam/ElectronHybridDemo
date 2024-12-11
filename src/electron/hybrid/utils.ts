/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { randomBytes } from 'crypto'
import cbor from 'cbor'

export const generateRandomBytes = (len: number = 32): Buffer => {
    return randomBytes(len)
}

export const generateCoseKey = (x962key: Buffer): Buffer => {
    if (x962key.length !== 65) {
        throw new Error('Invalid X962 key length')
    }
    
    let x = x962key.subarray(1, 33)
    let y = x962key.subarray(33, 65)

    const resultMap = new Map<number, any>()
    resultMap.set(1, 2)
    resultMap.set(3, -7)
    resultMap.set(-1, 1)
    resultMap.set(-2, x)
    resultMap.set(-3, y)

    // Convert the COSE key object to a CBOR encoded buffer
    return cbor.encode(resultMap)
}

export const digitEncodeQRBytes = (bytes: Buffer): string => {
    const chunkSize = 7
    const chunkDigits = 17
    const zeros = '00000000000000000'
    

    let ret = ''
    while(bytes.length >= chunkSize) {
        let chunk = Buffer.alloc(8);
        bytes.subarray(0, chunkSize).copy(chunk);
        bytes = bytes.subarray(chunkSize)
        let digitsStr = chunk.readBigInt64LE().toString(10)
        
        ret += zeros.slice(0, chunkDigits - digitsStr.length) + digitsStr
    }

    const partialChunkDigits = 0x0fda8530
    if (bytes.length > 0) {
        let digits = 15 & (partialChunkDigits >> (4 * bytes.length))
        let chunk = Buffer.alloc(8)
        bytes.copy(chunk)

        let digitsStr = chunk.readBigInt64LE().toString(10)
        ret += zeros.slice(0, digits - digitsStr.length)
        ret += digitsStr
    }

    return `FIDO:/${ret}`
}
