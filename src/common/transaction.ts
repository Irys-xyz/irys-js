/* eslint-disable no-case-declarations */

import type { Address, H256, Signature, U32, U64, U8 } from "./dataTypes";
import {
  createFixedUint8Array,
  decodeBase58ToBuf,
  jsonBigIntSerialize,
  promisePool,
  toFixedUint8Array,
} from "./utils";
import { arrayCompare, type MerkleChunk, type MerkleProof } from "./merkle";
import type { Input } from "rlp";
import { encode } from "rlp";
import { SigningKey } from "ethers";
import {
  computeAddress,
  encodeBase58,
  getBytes,
  hexlify,
  keccak256,
  recoverAddress,
} from "ethers";
import { IRYS_TESTNET_CHAIN_ID } from "./constants";
import { UnpackedChunk, chunkEndByteOffset } from "./chunk";
import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import type { Data } from "./types";
import { chunker } from "./chunker";
import AsyncRetry from "async-retry";

export type TransactionInterface =
  | UnsignedTransactionInterface
  | SignedTransactionInterface;

export type UnsignedTransactionInterface = {
  version: U8;
  anchor: H256;
  signer: Address;
  dataRoot: H256;
  dataSize: U64;
  termFee: U64;
  ledgerId: U32;
  chainId: U64;
  bundleFormat?: U64;
  permFee?: U64;
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
  "ledgerId",
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
  public termFee?: U64 = 0n;
  public chainId?: U64 = IRYS_TESTNET_CHAIN_ID;
  protected signature?: Signature = undefined;
  public bundleFormat?: U64 = 0n;
  public permFee?: U64 = undefined;
  public ledgerId?: U32 = 0;
  public irys!: IrysClient;
  // Computed when needed.
  public chunks?: Chunks;

  public constructor(
    irys: IrysClient,
    attributes?: Partial<UnsignedTransactionInterface>
  ) {
    // super();
    this.irys = irys;
    if (attributes) Object.assign(this, attributes);
  }

  get missingProperties(): string[] {
    return requiredUnsignedTxHeaderProps.reduce<string[]>((acc, k) => {
      if (this[k as keyof this] === undefined) acc.push(k);
      return acc;
    }, []);
  }

  public ledger(ledgerId: number): this {
    this.ledgerId = ledgerId;
    return this;
  }

  public async fillFee(): Promise<this> {
    if (this.ledgerId === undefined)
      throw new Error("missing required field ledgerId");
    // if we're ledger 0, get term & perm fee
    if (this.ledgerId === 0) {
      this.permFee = await this.irys.utils.getPrice(this.dataSize, 0);
      this.termFee = await this.irys.utils.getPrice(this.dataSize, 1);
    } else {
      this.termFee = await this.irys.utils.getPrice(
        this.dataSize,
        this.ledgerId
      );
    }
    return this;
  }

  public async getFees(): Promise<{ termFee: U64; permFee: U64 }> {
    await this.fillFee();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { termFee: this.termFee!, permFee: this.permFee! };
  }

  public async getFee(): Promise<U64> {
    await this.fillFee();
    return this.termFee! + this.permFee!;
  }

  public async fillAnchor(): Promise<this> {
    const apiAnchor = await this.irys.api.get("/block/latest");
    if (apiAnchor.data.blockHash) {
      this.anchor = toFixedUint8Array(
        decodeBase58ToBuf(apiAnchor.data.blockHash),
        32
      );
    } else {
      this.anchor = createFixedUint8Array(32).fill(1);
    }

    return this;
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(`Missing required properties: ${missing.join(", ")}`);
  }

  public async sign(key: SigningKey | string): Promise<SignedTransaction> {
    const signingKey = typeof key === "string" ? new SigningKey(key) : key;
    this.signer ??= toFixedUint8Array(
      getBytes(computeAddress(signingKey.publicKey)),
      20
    );

    if (!this.anchor) await this.fillAnchor();
    if (!this.termFee) await this.fillFee();

    const prehash = await this.getSignatureData();
    const signature = signingKey.sign(prehash);
    this.signature = toFixedUint8Array(getBytes(signature.serialized), 65);
    if (hexlify(this.signature) !== signature.serialized) {
      throw new Error();
    }
    const idBytes = getBytes(keccak256(signature.serialized));
    this.id = toFixedUint8Array(idBytes, 32);

    return new SignedTransaction(
      this.irys,
      this as any as SignedTransactionInterface
    );
  }

  // prepares some data into chunks, associating them with this transaction instance
  // note: this will *consume any provided async iterable* - you will need to provide a second instance for the `uploadChunks` function
  // if your data is small enough, I recommend converting it to a buffer/Uint8Array beforehand
  public async prepareChunks(data: Data): Promise<this> {
    const { chunks, dataSize } =
      await this.irys.merkle.generateTransactionChunks(data);
    if (dataSize === 0) {
      this.chunks = undefined;
      this.dataRoot = undefined;
      return this;
    }
    this.chunks = chunks;
    this.dataSize = BigInt(dataSize);
    this.dataRoot = toFixedUint8Array(this.chunks.dataRoot, 32);
    return this;
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
          this.ledgerId,
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
  public termFee!: U64;
  public ledgerId!: U32;
  public chainId!: U64;
  public bundleFormat?: U64 = undefined;
  public permFee?: U64 = undefined;
  public signature!: Signature;
  public irys: IrysClient;

  // Computed when needed.
  public chunks!: Chunks;

  public constructor(irys: IrysClient, attributes: SignedTransactionInterface) {
    // super();
    this.irys = irys;
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
    return jsonBigIntSerialize(this.header);
  }

  get txId(): string {
    return encodeBase58(this.id);
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
      ledgerId: this.ledgerId,
      chainId: this.chainId,
      signature: encodeBase58(this.signature),
      bundleFormat: this.bundleFormat,
      permFee: this.permFee,
    };
  }

  // Returns an unpacked chunk, slicing from the provided full data
  public async getChunk(
    idx: number,
    fullData: Uint8Array
  ): Promise<UnpackedChunk> {
    if (!this.chunks) {
      throw new Error(`Chunks have not been prepared`);
    }
    const proof = this.chunks.proofs[idx];
    const chunk = this.chunks.chunks[idx];

    if (
      !(await this.irys.merkle.validatePath(
        this.dataRoot,
        Number(
          chunkEndByteOffset(
            idx,
            this.dataSize,
            this.irys.storageConfig.chunkSize
          )
        ),
        0,
        Number(this.dataSize),
        proof.proof
      ))
    )
      throw new Error("Invalid chunk, check your data");
    const sliced = fullData.subarray(chunk.minByteRange, chunk.maxByteRange);
    return new UnpackedChunk({
      dataRoot: this.dataRoot,
      dataSize: this.dataSize,
      dataPath: proof.proof,
      bytes: sliced,
      txOffset: idx,
    });
  }

  // Returns an unpacked chunk, passing through the provided data as the chunk's full data
  public async getChunkPassthrough(
    idx: number,
    data: Uint8Array
  ): Promise<UnpackedChunk> {
    if (!this.chunks) {
      throw new Error(`Chunks have not been prepared`);
    }
    const proof = this.chunks.proofs[idx];
    // const chunk = this.chunks.chunks[idx];

    if (
      !(await this.irys.merkle.validatePath(
        this.dataRoot,
        Number(
          chunkEndByteOffset(
            idx,
            this.dataSize,
            this.irys.storageConfig.chunkSize
          )
        ),
        0,
        Number(this.dataSize),
        proof.proof
      ))
    )
      throw new Error("Invalid chunk, check your data");

    return new UnpackedChunk({
      dataRoot: this.dataRoot,
      dataSize: this.dataSize,
      dataPath: proof.proof,
      bytes: data,
      txOffset: idx,
    });
  }

  public async uploadHeader(): Promise<AxiosResponse> {
    const h = this.getHeaderSerialized();
    const res = await this.irys.api.post("/tx", h, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.status !== 200) {
      throw new Error(`Error uploading tx: ${res.statusText}`);
    }
    return res;
  }

  // Upload this transactions' chunks to the connected node
  // uploads using bound concurrency & retries
  public async uploadChunks(
    data: Data,
    opts?: {
      retry?: AsyncRetry.Options;
      concurrency?: number;
      onProgress?: (idx: number) => void;
    }
  ): Promise<void> {
    await promisePool(
      chunker(this.irys.storageConfig.chunkSize, { flush: true })(data),
      (chunkData, idx) =>
        AsyncRetry(
          async (bail) => {
            const chunk = await this.getChunkPassthrough(idx, chunkData);
            // TODO: skip uploading if this chunk exists on the node.
            const serializedChunk = chunk.toJSON();
            const res = await this.irys.api.post("/chunk", serializedChunk, {
              headers: { "Content-Type": "application/json" },
            });
            if (res.status >= 400)
              bail(
                new Error(`Error uploading chunk ${idx}: ${res.statusText}`)
              );
          },
          { retries: 3, minTimeout: 300, maxTimeout: 1000, ...opts?.retry }
        ),
      { concurrency: opts?.concurrency ?? 10, itemCb: opts?.onProgress }
    );
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
          this.ledgerId,
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
