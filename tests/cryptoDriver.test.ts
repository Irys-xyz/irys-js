import { NodeCryptoDriver } from "../src/node/cryptoDriver";

describe("NodeCryptoDriver", () => {
  const driver = new NodeCryptoDriver();

  describe("hash", () => {
    it("should produce correct SHA-256 for empty input", async () => {
      const result = await driver.hash(new Uint8Array(0));
      const hex = Buffer.from(result).toString("hex");
      expect(hex).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
    });

    it("should produce correct SHA-256 for known input", async () => {
      const input = new TextEncoder().encode("hello world");
      const result = await driver.hash(input);
      const hex = Buffer.from(result).toString("hex");
      expect(hex).toBe(
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
      );
    });

    it("should produce correct SHA-384", async () => {
      const input = new TextEncoder().encode("hello world");
      const result = await driver.hash(input, "SHA-384");
      const hex = Buffer.from(result).toString("hex");
      expect(hex).toBe(
        "fdbd8e75a67f29f701a4e040385e2e23986303ea10239211af907fcbb83578b3e417cb71ce646efd0819dd8c088de1bd"
      );
    });

    it("should default to SHA-256", async () => {
      const input = new TextEncoder().encode("test");
      const explicit = await driver.hash(input, "SHA-256");
      const defaultAlg = await driver.hash(input);
      expect(Buffer.from(defaultAlg)).toEqual(Buffer.from(explicit));
    });

    it("should throw for unsupported algorithm", async () => {
      const input = new TextEncoder().encode("test");
      await expect(driver.hash(input, "MD5")).rejects.toThrow(
        /Algorithm not supported/
      );
    });
  });
});
