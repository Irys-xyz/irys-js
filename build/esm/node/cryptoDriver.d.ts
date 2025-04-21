import type CryptoInterface from "../common/cryptoInterface.js";
export declare class NodeCryptoDriver implements CryptoInterface {
    readonly hashAlgorithm = "sha256";
    hash(data: Uint8Array, algorithm?: string): Promise<Uint8Array>;
    private parseHashAlgorithm;
}
export default NodeCryptoDriver;
