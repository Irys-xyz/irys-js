"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeCryptoDriver = void 0;
const crypto_1 = require("crypto");
class NodeCryptoDriver {
    constructor() {
        this.hashAlgorithm = "sha256";
    }
    hash(data, algorithm = "SHA-256") {
        return new Promise((resolve) => {
            resolve((0, crypto_1.createHash)(this.parseHashAlgorithm(algorithm)).update(data).digest());
        });
    }
    parseHashAlgorithm(algorithm) {
        switch (algorithm) {
            case "SHA-256":
                return "sha256";
            case "SHA-384":
                return "sha384";
            default:
                throw new Error(`Algorithm not supported: ${algorithm}`);
        }
    }
}
exports.NodeCryptoDriver = NodeCryptoDriver;
exports.default = NodeCryptoDriver;
//# sourceMappingURL=cryptoDriver.js.map