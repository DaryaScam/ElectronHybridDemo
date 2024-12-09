import { createECDH } from "crypto";

const ecdh = createECDH('secp256k1');
ecdh.generateKeys();
