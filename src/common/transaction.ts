/* eslint-disable no-case-declarations */

import type { Address, H256, Signature, u64, u8 } from "./dataTypes";
import { bufferTob64Url, toFixedUnint8Array } from "./utils";
import { arrayCompare, type MerkleChunk, type MerkleProof } from "./merkle";
import type Merkle from "./merkle";
import type { Input } from "rlp";
import { encode } from "rlp";
import type { SigningKey } from "ethers";
import {
  computeAddress,
  encodeBase58,
  getBytes,
  hexlify,
  keccak256,
  recoverAddress,
} from "ethers";
import { IRYS_CHAIN_ID } from "./constants";
import { UnpackedChunk } from "./chunk";

export type TransactionInterface =
  | UnsignedTransactionInterface
  | SignedTransactionInterface;

export type UnsignedTransactionInterface = {
  version: u8;
  anchor: H256;
  signer: Address;
  dataRoot: H256;
  dataSize: u64;
  termFee: u64;
  ledgerNum: u64;
  chainId: u64;
  bundleFormat?: u64;
  permFee?: u64;
  chunks?: Chunks;
};

export type SignedTransactionInterface = UnsignedTransactionInterface &
  SignedTransactionSubInterface;

export type SignedTransactionSubInterface = {
  id: H256;
  signature: Signature;
  chunks: Chunks;
};

export type Chunks = {
  dataRoot: Uint8Array;
  chunks: MerkleChunk[];
  proofs: MerkleProof[];
};

const requiredUnsignedTxHeaderProps = [
  "version",
  "anchor",
  "signer",
  "dataRoot",
  "dataSize",
  "termFee",
  "ledgerNum",
  "chainId",
];
const requiredSignedTxHeaderProps = [
  ...requiredUnsignedTxHeaderProps,
  "id",
  "signature",
];

const fullSignedTxHeaderProps = [
  ...requiredSignedTxHeaderProps,
  "bundleFormat",
  "permFee",
];

const fullSignedTxProps = [...fullSignedTxHeaderProps, "chunks"];

export class UnsignedTransaction
  // extends BaseObject
  implements Partial<UnsignedTransactionInterface>
{
  public version = 0;
  protected id?: H256 = undefined;
  public anchor?: H256 = undefined;
  public signer?: Address = undefined;
  public dataRoot?: H256 = undefined;
  public dataSize = 0n;
  public termFee?: u64 = 0n;
  public chainId?: u64 = IRYS_CHAIN_ID;
  protected signature?: Signature = undefined;
  public bundleFormat?: u64 = undefined;
  public permFee?: u64 = undefined;
  public ledgerNum?: u64 = undefined;

  protected deps!: { merkle: Merkle };
  // Computed when needed.
  public chunks?: Chunks;

  public constructor({
    attributes,
    deps,
  }: {
    attributes: Partial<UnsignedTransactionInterface>;
    deps: { merkle: Merkle };
  }) {
    // super();
    this.deps = deps;
    Object.assign(this, attributes);
  }

  get missingProperties(): string[] {
    return requiredUnsignedTxHeaderProps.reduce<string[]>((acc, k) => {
      if (this[k as keyof this] === undefined) acc.push(k);
      return acc;
    }, []);
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(`Missing required properties: ${missing.join(", ")}`);
  }

  public async sign(key: SigningKey): Promise<SignedTransaction> {
    this.signer ??= toFixedUnint8Array(
      getBytes(computeAddress(key.publicKey)),
      20
    );
    const prehash = await this.getSignatureData();
    const signature = await key.sign(prehash);
    this.signature = toFixedUnint8Array(getBytes(signature.serialized), 65);
    if (hexlify(this.signature) !== signature.serialized) {
      throw new Error();
    }
    const idBytes = getBytes(keccak256(signature.serialized));
    this.id = toFixedUnint8Array(idBytes, 32);

    return new SignedTransaction({
      attributes: this as any as SignedTransactionInterface,
      deps: this.deps,
    });
  }

  // prepares some data into chunks, associating them with this transaction instance
  public async prepareChunks(data: Uint8Array): Promise<void> {
    if (!this.chunks && data.byteLength > 0) {
      this.chunks = await this.deps.merkle.generateTransactionChunks(data);
      this.dataSize = BigInt(data.byteLength);
      this.dataRoot = toFixedUnint8Array(this.chunks.dataRoot, 32);
    }

    if (!this.chunks && data.byteLength === 0) {
      this.chunks = {
        chunks: [],
        dataRoot: new Uint8Array(),
        proofs: [],
      };
      this.dataRoot = undefined;
    }
  }

  // / returns the "signature data" aka the prehash (hash of all the tx fields)
  public getSignatureData(): Promise<Uint8Array> {
    switch (this.version) {
      case 0:
        // throw if any of the required fields are missing
        this.throwOnMissing();
        // RLP encoding - field ordering matters!
        const fields: Input = [
          this.version,
          this.anchor,
          this.signer,
          this.dataRoot,
          this.dataSize,
          this.termFee,
          this.ledgerNum,
          this.chainId,
        ];

        // Add optional fields only if they are defined
        if (this.bundleFormat !== undefined) {
          fields.push(this.bundleFormat);
        }
        if (this.permFee !== undefined) {
          fields.push(this.permFee);
        }

        const encoded = encode(fields);
        const prehash = getBytes(keccak256(encoded));

        return Promise.resolve(prehash);

      default:
        throw new Error(`Unknown transaction version : ${this.version}`);
    }
  }
}

export class SignedTransaction
  // extends BaseObject
  implements SignedTransactionInterface
{
  public id!: H256;
  public version!: number;
  public anchor!: H256;
  public signer!: Address;
  public dataRoot!: H256;
  public dataSize!: bigint;
  public termFee!: u64;
  public ledgerNum!: u64;
  public chainId!: u64;
  public bundleFormat?: u64 = undefined;
  public permFee?: u64 = undefined;
  public signature!: Signature;

  protected deps: { merkle: Merkle };

  // Computed when needed.
  public chunks!: Chunks;

  public constructor({
    attributes,
    deps,
  }: {
    attributes: SignedTransactionInterface;
    deps: { merkle: Merkle };
  }) {
    // super();
    this.deps = deps;
    // safer than object.assign, given we will be getting passed a class instance
    // this should "copy" over all header properties & chunks
    for (const k of fullSignedTxProps) {
      const v = attributes[k as keyof SignedTransactionInterface];
      if (v === undefined && requiredSignedTxHeaderProps.includes(k))
        throw new Error(
          `Unable to build signed transaction - missing field ${k}`
        );
      this[k as keyof this] = v as any;
    }
  }

  get missingProperties(): string[] {
    return requiredSignedTxHeaderProps.reduce<string[]>((acc, k) => {
      if (this[k as keyof this] === undefined) acc.push(k);
      return acc;
    }, []);
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(`Missing required properties: ${missing.join(", ")}`);
  }

  public getHeader(): SignedTransactionInterface {
    return fullSignedTxHeaderProps.reduce<Record<string, any>>((acc, k) => {
      acc[k as keyof SignedTransactionInterface] = this[k as keyof this];
      return acc;
    }, {}) as SignedTransactionInterface;
  }

  public getHeaderSerialized(): string {
    return JSON.stringify(
      this.header,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      4
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public get header() {
    return {
      id: encodeBase58(this.id),
      version: this.version,
      anchor: encodeBase58(this.anchor),
      signer: encodeBase58(this.signer),
      dataRoot: encodeBase58(this.dataRoot),
      dataSize: this.dataSize,
      termFee: this.termFee,
      ledgerNum: this.ledgerNum,
      chainId: this.chainId,
      signature: encodeBase58(this.signature),
      bundleFormat: this.bundleFormat,
      permFee: this.permFee,
    };
  }

  // Returns a chunk in a format suitable for posting to /chunk.
  public getChunk(idx: number, data: Uint8Array): UnpackedChunk {
    if (!this.chunks) {
      throw new Error(`Chunks have not been prepared`);
    }
    const proof = this.chunks.proofs[idx];
    const chunk = this.chunks.chunks[idx];

    return new UnpackedChunk({
      dataRoot: this.dataRoot,
      dataSize: this.dataSize,
      dataPath: bufferTob64Url(proof.proof),
      bytes: bufferTob64Url(data.slice(chunk.minByteRange, chunk.maxByteRange)),
      txOffset: idx,
    });
  }

  // Validate the signature by computing the prehash and recovering the signer's address using the prehash and the signature.
  // compares the recovered signer address to the tx's address, and returns true if they match
  public async validateSignature(): Promise<boolean> {
    const prehash = await this.getSignatureData();
    const recoveredAddress = getBytes(
      recoverAddress(prehash, hexlify(this.signature))
    );
    return arrayCompare(recoveredAddress, this.signer);
  }

  public getSignatureData(): Promise<Uint8Array> {
    switch (this.version) {
      case 0:
        // throw if any of the required fields are missing
        this.throwOnMissing();
        // RLP encoding - field ordering matters!
        const fields: Input = [
          this.version,
          this.anchor,
          this.signer,
          this.dataRoot,
          this.dataSize,
          this.termFee,
          this.ledgerNum,
          this.chainId,
        ];

        // Add optional fields only if they are defined
        if (this.bundleFormat !== undefined) {
          fields.push(this.bundleFormat);
        }
        if (this.permFee !== undefined) {
          fields.push(this.permFee);
        }

        const encoded = encode(fields);
        const prehash = getBytes(keccak256(encoded));

        return Promise.resolve(prehash);

      default:
        throw new Error(`Unknown transaction version : ${this.version}`);
    }
  }
}
