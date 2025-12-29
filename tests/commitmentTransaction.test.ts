import type { HDNodeWallet } from "ethers";
import { Wallet, SigningKey } from "ethers";
import {
  CommitmentTransactionVersion,
  CommitmentTypeId,
  UnsignedCommitmentTransaction,
  SignedCommitmentTransaction,
  encodeCommitmentType,
  signingEncodeCommitmentType,
  decodeBase58ToFixedNullish,
} from "../src/common/commitmentTransaction";
import type {
  CommitmentType,
  EncodedCommitmentType,
  SignedCommitmentTransactionInterface,
} from "../src/common/commitmentTransaction";
import { EncodedCommitmentTypeId } from "../src/common/commitmentTransaction";
import {
  toFixedUint8Array,
  encodeBase58,
  createFixedUint8Array,
  execToIrysAddr,
  decodeBase58ToFixed,
} from "../src/common/utils";

// Mock IrysClient for testing
const mockIrysClient = {} as any;

describe("CommitmentTransactionVersion", () => {
  it("should have V2 as the current version", () => {
    expect(CommitmentTransactionVersion.V2).toBe(2);
  });
});

describe("CommitmentTypeId", () => {
  it("should have correct numeric values for enum variants", () => {
    expect(CommitmentTypeId.STAKE).toBe(1);
    expect(CommitmentTypeId.PLEDGE).toBe(2);
    expect(CommitmentTypeId.UNPLEDGE).toBe(3);
    expect(CommitmentTypeId.UNSTAKE).toBe(4);
  });
});

describe("signingEncodeCommitmentType", () => {
  it("should encode STAKE type as a single number", () => {
    const stakeType: CommitmentType = { type: CommitmentTypeId.STAKE };
    const encoded = signingEncodeCommitmentType(stakeType);
    expect(encoded).toBe(CommitmentTypeId.STAKE);
  });

  it("should encode PLEDGE type as an array", () => {
    const pledgeType: CommitmentType = {
      type: CommitmentTypeId.PLEDGE,
      pledgeCountBeforeExecuting: 12345n,
    };
    const encoded = signingEncodeCommitmentType(pledgeType);
    expect(Array.isArray(encoded)).toBe(true);
    expect((encoded as any[])[0]).toBe(CommitmentTypeId.PLEDGE);
    expect((encoded as any[])[1]).toBe(12345n);
  });

  it("should encode UNPLEDGE type with partition hash", () => {
    const partitionHash = createFixedUint8Array(32).fill(42);
    const unpledgeType: CommitmentType = {
      type: CommitmentTypeId.UNPLEDGE,
      pledgeCountBeforeExecuting: 99999n,
      partitionHash,
    };
    const encoded = signingEncodeCommitmentType(unpledgeType);
    expect(Array.isArray(encoded)).toBe(true);
    expect((encoded as any[])[0]).toBe(CommitmentTypeId.UNPLEDGE);
    expect((encoded as any[])[1]).toBe(99999n);
    expect((encoded as any[])[2]).toEqual(partitionHash);
  });

  it("should encode UNSTAKE type as a single number", () => {
    const unstakeType: CommitmentType = { type: CommitmentTypeId.UNSTAKE };
    const encoded = signingEncodeCommitmentType(unstakeType);
    expect(encoded).toBe(CommitmentTypeId.UNSTAKE);
  });

  it("should handle maximum U64 pledge count", () => {
    const maxU64 = 18446744073709551615n;
    const pledgeType: CommitmentType = {
      type: CommitmentTypeId.PLEDGE,
      pledgeCountBeforeExecuting: maxU64,
    };
    const encoded = signingEncodeCommitmentType(pledgeType);
    expect((encoded as any[])[1]).toBe(maxU64);
  });

  it("should handle zero pledge count", () => {
    const pledgeType: CommitmentType = {
      type: CommitmentTypeId.PLEDGE,
      pledgeCountBeforeExecuting: 0n,
    };
    const encoded = signingEncodeCommitmentType(pledgeType);
    expect((encoded as any[])[1]).toBe(0n);
  });
});

describe("encodeCommitmentType", () => {
  it("should encode STAKE type correctly", () => {
    const stakeType: CommitmentType = { type: CommitmentTypeId.STAKE };
    const encoded = encodeCommitmentType(stakeType);
    expect(encoded).toEqual({ type: EncodedCommitmentTypeId.STAKE });
  });

  it("should encode PLEDGE type with string pledge count", () => {
    const pledgeType: CommitmentType = {
      type: CommitmentTypeId.PLEDGE,
      pledgeCountBeforeExecuting: 12345n,
    };
    const encoded = encodeCommitmentType(pledgeType);
    expect(encoded).toEqual({
      type: EncodedCommitmentTypeId.PLEDGE,
      pledgeCountBeforeExecuting: "12345",
    });
  });

  it("should encode UNPLEDGE type with base58 partition hash", () => {
    const partitionHash = createFixedUint8Array(32).fill(42);
    const unpledgeType: CommitmentType = {
      type: CommitmentTypeId.UNPLEDGE,
      pledgeCountBeforeExecuting: 99999n,
      partitionHash,
    };
    const encoded = encodeCommitmentType(unpledgeType);
    expect(encoded.type).toBe(EncodedCommitmentTypeId.UNPLEDGE);

    const unpledgeEncoded = encoded as Extract<
      EncodedCommitmentType,
      { type: EncodedCommitmentTypeId.UNPLEDGE }
    >;
    expect(unpledgeEncoded.pledgeCountBeforeExecuting).toBe("99999");
    expect(typeof unpledgeEncoded.partitionHash).toBe("string");
  });

  it("should encode UNSTAKE type correctly", () => {
    const unstakeType: CommitmentType = { type: CommitmentTypeId.UNSTAKE };
    const encoded = encodeCommitmentType(unstakeType);
    expect(encoded).toEqual({ type: EncodedCommitmentTypeId.UNSTAKE });
  });
});

describe("decodeBase58ToFixedNullish", () => {
  it("should return undefined for undefined input", () => {
    const result = decodeBase58ToFixedNullish(undefined, 32);
    expect(result).toBeUndefined();
  });

  it("should decode valid base58 string", () => {
    const original = createFixedUint8Array(32).fill(123);
    const base58 = encodeBase58(original);
    const decoded = decodeBase58ToFixedNullish(base58, 32);
    expect(decoded).toEqual(original);
  });

  it("should handle different lengths", () => {
    const original20 = createFixedUint8Array(20).fill(99);
    const base58 = encodeBase58(original20);
    const decoded = decodeBase58ToFixedNullish(base58, 20);
    expect(decoded).toEqual(original20);
  });
});

describe("UnsignedCommitmentTransaction", () => {
  describe("constructor", () => {
    it("should create transaction with default V2 version", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient);
      expect(tx.version).toBe(CommitmentTransactionVersion.V2);
    });

    it("should accept attributes in constructor", () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
      });
      expect(tx.anchor).toEqual(anchor);
      expect(tx.chainId).toBe(1270n);
      expect(tx.fee).toBe(1234n);
      expect(tx.value).toBe(5678n);
    });

    it("should throw error for invalid version", () => {
      expect(() => {
        new UnsignedCommitmentTransaction(mockIrysClient, {
          version: 1 as any,
        });
      }).toThrow(/Invalid commitment version/);
    });

    it("should accept V2 version explicitly", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        version: CommitmentTransactionVersion.V2,
      });
      expect(tx.version).toBe(2);
    });
  });

  describe("encode/decode", () => {
    it("should encode and decode transaction correctly", () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const signer = createFixedUint8Array(20).fill(2);
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        signer,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const encoded = tx.encode();
      const decoded = UnsignedCommitmentTransaction.decode(
        mockIrysClient,
        encoded
      );

      expect(decoded.anchor).toEqual(anchor);
      expect(decoded.signer).toEqual(signer);
      expect(decoded.chainId).toBe(1270n);
      expect(decoded.fee).toBe(1234n);
      expect(decoded.value).toBe(5678n);
      expect(decoded.commitmentType).toEqual({ type: CommitmentTypeId.STAKE });
    });

    it("should handle undefined optional fields", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient);
      const encoded = tx.encode();

      expect(encoded.anchor).toBeUndefined();
      expect(encoded.signer).toBeUndefined();
      expect(encoded.commitmentType).toBeUndefined();
    });

    it("should encode PLEDGE commitment type", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        commitmentType: {
          type: CommitmentTypeId.PLEDGE,
          pledgeCountBeforeExecuting: 42n,
        },
        chainId: 1n,
        fee: 100n,
        value: 200n,
      });

      const encoded = tx.encode();
      const pledgeEncoded = encoded.commitmentType as Extract<
        EncodedCommitmentType,
        { type: EncodedCommitmentTypeId.PLEDGE }
      >;
      expect(pledgeEncoded?.type).toBe(EncodedCommitmentTypeId.PLEDGE);
      expect(pledgeEncoded?.pledgeCountBeforeExecuting).toBe("42");
    });

    it("should encode UNPLEDGE commitment type with partition hash", () => {
      const partitionHash = createFixedUint8Array(32).fill(99);
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        commitmentType: {
          type: CommitmentTypeId.UNPLEDGE,
          pledgeCountBeforeExecuting: 123n,
          partitionHash,
        },
        chainId: 1n,
        fee: 100n,
        value: 200n,
      });

      const encoded = tx.encode();
      const decoded = UnsignedCommitmentTransaction.decode(
        mockIrysClient,
        encoded
      );

      expect(decoded.commitmentType?.type).toBe(CommitmentTypeId.UNPLEDGE);
      expect((decoded.commitmentType as any).pledgeCountBeforeExecuting).toBe(
        123n
      );
      expect((decoded.commitmentType as any).partitionHash).toEqual(
        partitionHash
      );
    });
  });

  describe("toJSON", () => {
    it("should serialize to JSON string", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
      });

      const json = tx.toJSON();
      expect(typeof json).toBe("string");
      const parsed = JSON.parse(json);
      expect(parsed.chainId).toBe("1270");
      expect(parsed.fee).toBe("1234");
      expect(parsed.value).toBe("5678");
    });
  });

  describe("missingProperties", () => {
    it("should report missing required properties", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient);
      const missing = tx.missingProperties;

      expect(missing).toContain("anchor");
      expect(missing).toContain("signer");

      expect(missing).toContain("commitmentType");
    });

    it("should not report present properties as missing", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor: createFixedUint8Array(32).fill(1),
        signer: createFixedUint8Array(20).fill(2),
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      expect(tx.missingProperties).toEqual([]);
    });
  });

  describe("isSigned", () => {
    it("should return false for unsigned transaction", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient);
      expect(tx.isSigned()).toBe(false);
    });
  });

  describe("throwOnMissing", () => {
    it("should throw when required properties are missing", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient);
      expect(() => tx.throwOnMissing()).toThrow();
    });

    it("should not throw when all properties are present", () => {
      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor: createFixedUint8Array(32).fill(1),
        signer: createFixedUint8Array(20).fill(2),
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      expect(() => tx.throwOnMissing()).not.toThrow();
    });
  });

  describe("sign", () => {
    it("should sign transaction with private key string", async () => {
      const wallet = Wallet.createRandom();
      const anchor = createFixedUint8Array(32).fill(1);

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const signed = await tx.sign(wallet.privateKey);

      expect(signed).toBeInstanceOf(SignedCommitmentTransaction);
      expect(signed.signature).toBeDefined();
      expect(signed.id).toBeDefined();
      expect(signed.signer).toBeDefined();
    });

    it("should sign transaction with SigningKey", async () => {
      const wallet = Wallet.createRandom();
      const signingKey = new SigningKey(wallet.privateKey);
      const anchor = createFixedUint8Array(32).fill(1);

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const signed = await tx.sign(signingKey);

      expect(signed).toBeInstanceOf(SignedCommitmentTransaction);
      expect(signed.signature).toBeDefined();
      expect(signed.id).toBeDefined();
    });

    it("should set signer address if not already set", async () => {
      const wallet = Wallet.createRandom();
      const anchor = createFixedUint8Array(32).fill(1);

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      expect(tx.signer).toBeUndefined();

      const signed = await tx.sign(wallet.privateKey);

      expect(signed.signer).toBeDefined();
      expect(signed.signer?.length).toBe(20);
    });

    it("should use existing signer if already set", async () => {
      const wallet = Wallet.createRandom();
      const anchor = createFixedUint8Array(32).fill(1);
      const existingSigner = decodeBase58ToFixed(
        execToIrysAddr(wallet.address),
        20
      );

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        signer: existingSigner,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const signed = await tx.sign(wallet.privateKey);

      expect(signed.signer).toEqual(existingSigner);
    });

    it("should generate deterministic signature for same data", async () => {
      const wallet = Wallet.createRandom();
      const anchor = createFixedUint8Array(32).fill(1);

      const tx1 = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const tx2 = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const signed1 = await tx1.sign(wallet.privateKey);
      const signed2 = await tx2.sign(wallet.privateKey);

      expect(signed1.signature).toEqual(signed2.signature);
      expect(signed1.id).toEqual(signed2.id);
    });

    it("should throw on missing properties before signing", async () => {
      const wallet = Wallet.createRandom();
      const tx = new UnsignedCommitmentTransaction(mockIrysClient);

      await expect(tx.sign(wallet.privateKey)).rejects.toThrow();
    });
  });

  describe("getSignatureData", () => {
    it("should generate signature data for V2 transaction", async () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const signer = createFixedUint8Array(20).fill(2);

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        signer,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
        version: CommitmentTransactionVersion.V2,
      });

      const sigData = await tx.getSignatureData();

      expect(sigData).toBeInstanceOf(Uint8Array);
      expect(sigData.length).toBe(32); // keccak256 hash
    });

    it("should produce different signature data for different transactions", async () => {
      const anchor1 = createFixedUint8Array(32).fill(1);
      const anchor2 = createFixedUint8Array(32).fill(2);
      const signer = createFixedUint8Array(20).fill(3);

      const tx1 = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor: anchor1,
        signer,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const tx2 = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor: anchor2,
        signer,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const sigData1 = await tx1.getSignatureData();
      const sigData2 = await tx2.getSignatureData();

      expect(sigData1).not.toEqual(sigData2);
    });

    it("should handle PLEDGE commitment type in signature data", async () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const signer = createFixedUint8Array(20).fill(2);

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        signer,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: {
          type: CommitmentTypeId.PLEDGE,
          pledgeCountBeforeExecuting: 42n,
        },
      });

      const sigData = await tx.getSignatureData();

      expect(sigData).toBeInstanceOf(Uint8Array);
      expect(sigData.length).toBe(32);
    });

    it("should handle UNPLEDGE commitment type in signature data", async () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const signer = createFixedUint8Array(20).fill(2);
      const partitionHash = createFixedUint8Array(32).fill(99);

      const tx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        signer,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: {
          type: CommitmentTypeId.UNPLEDGE,
          pledgeCountBeforeExecuting: 42n,
          partitionHash,
        },
      });

      const sigData = await tx.getSignatureData();

      expect(sigData).toBeInstanceOf(Uint8Array);
      expect(sigData.length).toBe(32);
    });
  });
});

describe("SignedCommitmentTransaction", () => {
  let wallet: HDNodeWallet;
  let signedTx: SignedCommitmentTransaction;

  beforeEach(async () => {
    wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);

    const unsignedTx = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1234n,
      value: 5678n,
      commitmentType: { type: CommitmentTypeId.STAKE },
    });

    signedTx = await unsignedTx.sign(wallet.privateKey);
  });

  describe("constructor", () => {
    it("should create signed transaction from attributes", () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const signer = createFixedUint8Array(20).fill(2);
      const signature = createFixedUint8Array(65).fill(3);
      const id = encodeBase58(createFixedUint8Array(32).fill(4));

      const tx = new SignedCommitmentTransaction(mockIrysClient, {
        anchor,
        signer,
        signature,
        id,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
        version: CommitmentTransactionVersion.V2,
      });

      expect(tx.anchor).toEqual(anchor);
      expect(tx.signer).toEqual(signer);
      expect(tx.signature).toEqual(signature);
      expect(tx.id).toBe(id);
    });

    it("should throw error for invalid version", () => {
      expect(() => {
        new SignedCommitmentTransaction(mockIrysClient, {
          anchor: createFixedUint8Array(32),
          signer: createFixedUint8Array(20),
          signature: createFixedUint8Array(65),
          id: createFixedUint8Array(32),
          chainId: 1270n,
          fee: 1234n,
          value: 5678n,
          commitmentType: { type: CommitmentTypeId.STAKE },
          version: 1 as any,
        } as any);
      }).toThrow(/Invalid commitment version/);
    });

    it("should throw an error for missing core properties", () => {
      expect(() => {
        new SignedCommitmentTransaction(
          mockIrysClient,
          {} as SignedCommitmentTransactionInterface
        );
      }).toThrow(/Unable to build signed transaction - missing field version/);
    });
  });

  describe("isSigned", () => {
    it("should return true for signed transaction", () => {
      expect(signedTx.isSigned()).toBe(true);
    });
  });

  describe("missingProperties", () => {
    it("should include signature and id in required properties", () => {
      const tx = new SignedCommitmentTransaction(mockIrysClient, {
        anchor: createFixedUint8Array(32),
        signer: createFixedUint8Array(20),
        signature: createFixedUint8Array(65),
        id: encodeBase58(createFixedUint8Array(32)),
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
        version: CommitmentTransactionVersion.V2,
      });

      expect(tx.missingProperties).toEqual([]);
    });

    it("should not report present properties as missing", () => {
      expect(signedTx.missingProperties).toEqual([]);
    });
  });

  describe("encode/decode", () => {
    it("should encode signed transaction", () => {
      const encoded = signedTx.encode();

      expect(encoded.signature).toBeDefined();
      expect(encoded.id).toBeDefined();
      expect(typeof encoded.signature).toBe("string");
      expect(typeof encoded.id).toBe("string");
      expect(typeof encoded.chainId).toBe("string");
      expect(typeof encoded.fee).toBe("string");
      expect(typeof encoded.value).toBe("string");
    });

    it("should decode signed transaction", () => {
      const encoded = signedTx.encode();
      const decoded = SignedCommitmentTransaction.decode(
        mockIrysClient,
        encoded
      );

      expect(decoded.signature).toEqual(signedTx.signature);
      expect(decoded.id).toBe(signedTx.id);
      expect(decoded.anchor).toEqual(signedTx.anchor);
      expect(decoded.signer).toEqual(signedTx.signer);
      expect(decoded.chainId).toBe(signedTx.chainId);
      expect(decoded.fee).toBe(signedTx.fee);
      expect(decoded.value).toBe(signedTx.value);
    });

    it("should round-trip encode/decode correctly", () => {
      const encoded = signedTx.encode();
      const decoded = SignedCommitmentTransaction.decode(
        mockIrysClient,
        encoded
      );
      const reEncoded = decoded.encode();

      expect(reEncoded).toEqual(encoded);
    });
  });

  describe("toJSON", () => {
    it("should serialize to JSON string", () => {
      const json = signedTx.toJSON();
      expect(typeof json).toBe("string");

      const parsed = JSON.parse(json);
      expect(parsed.signature).toBeDefined();
      expect(parsed.id).toBeDefined();
      expect(parsed.chainId).toBeDefined();
    });
  });

  describe("getSignatureData", () => {
    it("should return same signature data as unsigned transaction", async () => {
      const anchor = createFixedUint8Array(32).fill(1);
      const existingSigner = decodeBase58ToFixed(
        execToIrysAddr(wallet.address),
        20
      );

      const unsignedTx = new UnsignedCommitmentTransaction(mockIrysClient, {
        anchor,
        signer: existingSigner,
        chainId: 1270n,
        fee: 1234n,
        value: 5678n,
        commitmentType: { type: CommitmentTypeId.STAKE },
      });

      const unsignedSigData = await unsignedTx.getSignatureData();
      const signed = await unsignedTx.sign(wallet.privateKey);
      const signedSigData = await signed.getSignatureData();

      expect(signedSigData).toEqual(unsignedSigData);
    });
  });

  describe("validateSignature", () => {
    it("should verify valid signature", async () => {
      const isValid = await signedTx.validateSignature();
      expect(isValid).toBe(true);
    });

    it("should fail verification for tampered transaction", async () => {
      // Create a copy and tamper with it
      const tamperedTx = new SignedCommitmentTransaction(mockIrysClient, {
        ...signedTx,
        fee: 9999n, // Change fee
      });

      const isValid = await tamperedTx.validateSignature();
      expect(isValid).toBe(false);
    });

    it("should fail verification for wrong signature", async () => {
      const wrongSignature = createFixedUint8Array(65).fill(99);
      const tamperedTx = new SignedCommitmentTransaction(mockIrysClient, {
        ...signedTx,
        signature: wrongSignature,
      });

      const isValid = await tamperedTx.validateSignature();
      expect(isValid).toBe(false);
    });
  });
});

describe("Integration: Complete Transaction Flow", () => {
  it("should handle complete STAKE transaction flow", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);

    // Create unsigned transaction
    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1000n,
      value: 5000n,
      commitmentType: { type: CommitmentTypeId.STAKE },
    });

    // Sign transaction
    const signed = await unsigned.sign(wallet.privateKey);

    // Verify signature
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);

    // Encode and decode
    const encoded = signed.encode();
    const decoded = SignedCommitmentTransaction.decode(mockIrysClient, encoded);

    // Verify decoded transaction
    const decodedIsValid = await decoded.validateSignature();
    expect(decodedIsValid).toBe(true);
  });

  it("should handle complete PLEDGE transaction flow", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1000n,
      value: 5000n,
      commitmentType: {
        type: CommitmentTypeId.PLEDGE,
        pledgeCountBeforeExecuting: 42n,
      },
    });

    const signed = await unsigned.sign(wallet.privateKey);
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);

    const encoded = signed.encode();
    const decoded = SignedCommitmentTransaction.decode(mockIrysClient, encoded);

    expect(decoded.commitmentType?.type).toBe(CommitmentTypeId.PLEDGE);
    expect((decoded.commitmentType as any).pledgeCountBeforeExecuting).toBe(
      42n
    );
  });

  it("should handle complete UNPLEDGE transaction flow", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);
    const partitionHash = createFixedUint8Array(32).fill(77);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1000n,
      value: 5000n,
      commitmentType: {
        type: CommitmentTypeId.UNPLEDGE,
        pledgeCountBeforeExecuting: 123n,
        partitionHash,
      },
    });

    const signed = await unsigned.sign(wallet.privateKey);
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);

    const encoded = signed.encode();
    const decoded = SignedCommitmentTransaction.decode(mockIrysClient, encoded);

    expect(decoded.commitmentType?.type).toBe(CommitmentTypeId.UNPLEDGE);
    expect((decoded.commitmentType as any).pledgeCountBeforeExecuting).toBe(
      123n
    );
    expect((decoded.commitmentType as any).partitionHash).toEqual(
      partitionHash
    );
  });

  it("should handle complete UNSTAKE transaction flow", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1000n,
      value: 5000n,
      commitmentType: { type: CommitmentTypeId.UNSTAKE },
    });

    const signed = await unsigned.sign(wallet.privateKey);
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);

    const encoded = signed.encode();
    const decoded = SignedCommitmentTransaction.decode(mockIrysClient, encoded);

    expect(decoded.commitmentType?.type).toBe(CommitmentTypeId.UNSTAKE);
  });

  it("should handle maximum value edge cases", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(255);
    const maxU64 = 18446744073709551615n;

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: maxU64,
      fee: maxU64,
      value: maxU64,
      commitmentType: {
        type: CommitmentTypeId.PLEDGE,
        pledgeCountBeforeExecuting: maxU64,
      },
    });

    const signed = await unsigned.sign(wallet.privateKey);
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);

    const encoded = signed.encode();
    const decoded = SignedCommitmentTransaction.decode(mockIrysClient, encoded);

    expect(decoded.chainId).toBe(maxU64);
    expect(decoded.fee).toBe(maxU64);
    expect(decoded.value).toBe(maxU64);
  });

  it("should handle zero values", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(0);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 0n,
      fee: 0n,
      value: 0n,
      commitmentType: {
        type: CommitmentTypeId.PLEDGE,
        pledgeCountBeforeExecuting: 0n,
      },
    });

    const signed = await unsigned.sign(wallet.privateKey);
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);
  });
});

describe("Edge Cases and Error Handling", () => {
  it("should handle transaction with all fields at boundary values", async () => {
    const wallet = Wallet.createRandom();
    const anchor = new Uint8Array(32);
    crypto.getRandomValues(anchor);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor: toFixedUint8Array(anchor, 32),
      chainId: 1n,
      fee: 1n,
      value: 1n,
      commitmentType: { type: CommitmentTypeId.STAKE },
    });

    const signed = await unsigned.sign(wallet.privateKey);
    expect(signed).toBeInstanceOf(SignedCommitmentTransaction);
  });

  it("should reject transaction with missing commitmentType", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1000n,
      value: 5000n,
      // commitmentType is missing
    });

    await expect(unsigned.sign(wallet.privateKey)).rejects.toThrow();
  });

  it("should handle RLP encoding correctly for complex commitment types", async () => {
    const wallet = Wallet.createRandom();
    const existingSigner = decodeBase58ToFixed(
      execToIrysAddr(wallet.address),
      20
    );
    const anchor = createFixedUint8Array(32).fill(1);
    const partitionHash = createFixedUint8Array(32).fill(42);

    const unsigned = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      signer: existingSigner,
      chainId: 1270n,
      fee: 1234n,
      value: 5678n,
      commitmentType: {
        type: CommitmentTypeId.UNPLEDGE,
        pledgeCountBeforeExecuting: 999n,
        partitionHash,
      },
    });

    // Get signature data which uses RLP encoding
    const sigData = await unsigned.getSignatureData();
    expect(sigData).toBeInstanceOf(Uint8Array);
    expect(sigData.length).toBe(32);

    // Sign and verify
    const signed = await unsigned.sign(wallet.privateKey);
    const isValid = await signed.validateSignature();
    expect(isValid).toBe(true);
  });

  it("should maintain data integrity through multiple encode/decode cycles", async () => {
    const wallet = Wallet.createRandom();
    const anchor = createFixedUint8Array(32).fill(1);

    const original = new UnsignedCommitmentTransaction(mockIrysClient, {
      anchor,
      chainId: 1270n,
      fee: 1234n,
      value: 5678n,
      commitmentType: { type: CommitmentTypeId.STAKE },
    });

    const signed = await original.sign(wallet.privateKey);

    // Multiple encode/decode cycles
    let current = signed;
    for (let i = 0; i < 5; i++) {
      const encoded = current.encode();
      current = SignedCommitmentTransaction.decode(mockIrysClient, encoded);
    }

    // Verify data integrity
    expect(current.anchor).toEqual(signed.anchor);
    expect(current.chainId).toBe(signed.chainId);
    expect(current.fee).toBe(signed.fee);
    expect(current.value).toBe(signed.value);
    expect(current.signature).toEqual(signed.signature);
    expect(current.id).toBe(signed.id);
  });
});
