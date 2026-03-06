import { StorageConfig } from "../src/common/storageConfig";
import type { EncodedStorageConfigInterface } from "../src/common/storageConfig";

const validEncoded: EncodedStorageConfigInterface = {
  chunkSize: "262144",
  numChunksInPartition: "10",
  numChunksInRecallRange: "2",
  numPartitionsInSlot: "1",
  entropyPackingIterations: "2000",
};

describe("StorageConfig", () => {
  describe("constructor", () => {
    it("should use defaults when no config is provided", () => {
      const config = new StorageConfig();
      expect(config.chunkSize).toBe(256 * 1024);
      expect(config.numChunksInPartition).toBe(10);
      expect(config.numChunksInRecallRange).toBe(2);
      expect(config.numPartitionsInSlot).toBe(1);
      expect(config.entropyPackingIterations).toBe(2000);
    });

    it("should override only provided fields", () => {
      const config = new StorageConfig({ chunkSize: 65536 });
      expect(config.chunkSize).toBe(65536);
      expect(config.numChunksInPartition).toBe(10);
    });

    it("should override all fields when all are provided", () => {
      const config = new StorageConfig({
        chunkSize: 65536,
        numChunksInPartition: 20,
        numChunksInRecallRange: 5,
        numPartitionsInSlot: 3,
        entropyPackingIterations: 5000,
      });
      expect(config.chunkSize).toBe(65536);
      expect(config.numChunksInPartition).toBe(20);
      expect(config.numChunksInRecallRange).toBe(5);
      expect(config.numPartitionsInSlot).toBe(3);
      expect(config.entropyPackingIterations).toBe(5000);
    });
  });

  describe("decode", () => {
    it("should decode valid encoded config", () => {
      const config = StorageConfig.decode(validEncoded);
      expect(config.chunkSize).toBe(262144);
      expect(config.numChunksInPartition).toBe(10);
      expect(config.numChunksInRecallRange).toBe(2);
      expect(config.numPartitionsInSlot).toBe(1);
      expect(config.entropyPackingIterations).toBe(2000);
    });

    it.each([
      ["chunkSize", { ...validEncoded, chunkSize: "0" }],
      ["chunkSize", { ...validEncoded, chunkSize: "999999999" }],
      ["numChunksInPartition", { ...validEncoded, numChunksInPartition: "0" }],
      [
        "numChunksInRecallRange",
        { ...validEncoded, numChunksInRecallRange: "-1" },
      ],
      ["numPartitionsInSlot", { ...validEncoded, numPartitionsInSlot: "0" }],
      [
        "entropyPackingIterations",
        { ...validEncoded, entropyPackingIterations: "0" },
      ],
      [
        "entropyPackingIterations",
        { ...validEncoded, entropyPackingIterations: "200000000" },
      ],
    ])(
      "should reject invalid %s",
      (_field, encoded) => {
        expect(() =>
          StorageConfig.decode(encoded as EncodedStorageConfigInterface)
        ).toThrow(/Invalid StorageConfig/);
      }
    );

    it("should reject non-integer chunkSize", () => {
      expect(() =>
        StorageConfig.decode({ ...validEncoded, chunkSize: "1.5" })
      ).toThrow(/Invalid StorageConfig/);
    });

    it("should reject NaN values", () => {
      expect(() =>
        StorageConfig.decode({ ...validEncoded, chunkSize: "notanumber" })
      ).toThrow(/Invalid StorageConfig/);
    });
  });
});
