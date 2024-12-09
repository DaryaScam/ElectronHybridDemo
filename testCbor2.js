import {encode} from 'cbor2';

let map = new Map();
map.set(0, Buffer.from([0x00, 0x01, 0x02, 0x03]));
map.set(1, new Uint8Array([0x00, 0x01, 0x02, 0x03]));
map.set(2, "test");

console.log("Result", encode(map))
/* Result Uint8Array(37) [
  163,   0, 162, 100, 116, 121, 112, 101, 102,
   66, 117, 102, 102, 101, 114, 100, 100,  97,
  116,  97, 132,   0,   1,   2,   3,   1,  68,
    0,   1,   2,   3,   2, 100, 116, 101, 115,
  116
] */

console.log("Result hex", Buffer.from(encode(map)).toString('hex'))
// Result hex a300a264747970656642756666657264646174618400010203014400010203026474657374