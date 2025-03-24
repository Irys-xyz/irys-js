import { createHash } from "crypto";
export class NodeCryptoDriver {
    hashAlgorithm = "sha256";
    hash(data, algorithm = "SHA-256") {
        return new Promise((resolve) => {
            resolve(createHash(this.parseHashAlgorithm(algorithm)).update(data).digest());
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
export default NodeCryptoDriver;
//# sourceMappingURL=cryptoDriver.js.map