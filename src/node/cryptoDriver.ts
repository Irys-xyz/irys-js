import type CryptoInterface from "../common/cryptoInterface";
import { createHash } from "crypto";

export class NodeCryptoDriver implements CryptoInterface {
  public readonly hashAlgorithm = "sha256";

  public hash(data: Uint8Array, algorithm = "SHA-256"): Promise<Uint8Array> {
    return new Promise((resolve) => {
      resolve(
        createHash(this.parseHashAlgorithm(algorithm)).update(data).digest()
      );
    });
  }

  private parseHashAlgorithm(algorithm: string): string {
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
