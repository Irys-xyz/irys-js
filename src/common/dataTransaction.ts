/* eslint-disable no-case-declarations */

import type {
  Address,
  Base58,
  H256,
  Signature,
  TransactionId,
  U256,
  U32,
  U64,
  U8,
  UTF8,
} from "./dataTypes";
import {
  decodeBase58ToFixed,
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
import { V1_API_ROUTES, type ApiRequestConfig } from "./api";

export type DataTransactionInterface =
  | UnsignedDataTransactionInterface
  | SignedDataTransactionInterface;

export type UnsignedDataTransactionInterface = {
  version: U8;
  anchor: H256;
  signer: Address;
  dataRoot: H256;
  dataSize: U64;
  headerSize: U64;
  termFee: U256;
  ledgerId: U32;
  chainId: U64;
  bundleFormat?: U64;
  permFee?: U256;
  chunks?: Chunks;
};

export type SignedDataTransactionInterface =
  UnsignedDataTransactionInterface & {
    id: Base58;
    signature: Signature;
    chunks?: Chunks;
  };

export type EncodedUnsignedDataTransactionInterface = {
  version: U8;
  anchor: Base58<H256>;
  signer: Base58<Address>;
  dataRoot: Base58<H256>;
  dataSize: UTF8<U64>;
  headerSize: UTF8<U64>;
  termFee: UTF8<U64>;
  ledgerId: U32;
  chainId: UTF8<U64>;
  bundleFormat?: UTF8<U64>;
  permFee?: UTF8<U64>;
};

export type EncodedSignedDataTransactionInterface =
  EncodedUnsignedDataTransactionInterface & {
    id: Base58<H256>;
    signature: Base58<Signature>;
    chunks?: UTF8<Chunks>;
  };

export type Chunks = {
  dataRoot: Uint8Array;
  chunks: MerkleChunk[];
  proofs: MerkleProof[];
};

const requiredUnsignedDataTxHeaderProps = [
  "version",
  "anchor",
  "signer",
  "dataRoot",
  "dataSize",
  "termFee",
  "ledgerId",
  "chainId",
  "headerSize",
];
const requiredSignedDataTxHeaderProps = [
  ...requiredUnsignedDataTxHeaderProps,
  "id",
  "signature",
];

const fullSignedDataTxHeaderProps = [
  ...requiredSignedDataTxHeaderProps,
  "bundleFormat",
  "permFee",
];

const fullSignedDataTxProps = [...fullSignedDataTxHeaderProps, "chunks"];

export class UnsignedDataTransaction
  // extends BaseObject
  implements Partial<UnsignedDataTransactionInterface>
{
  public version: U8 = 0;
  public id?: TransactionId = undefined;
  public anchor?: H256 = undefined;
  public signer?: Address = undefined;
  public dataRoot?: H256 = undefined;
  public dataSize: U64 = 0n;
  public termFee: U256 = 0n;
  public chainId: U64 = IRYS_TESTNET_CHAIN_ID;
  public signature?: Signature = undefined;
  public bundleFormat?: U64 = undefined;
  public permFee?: U256 = undefined;
  public ledgerId: U32 = 0;
  public headerSize: U64 = 0n;
  public irys!: IrysClient;
  // Computed when needed.
  public chunks?: Chunks;

  public constructor(
    irys: IrysClient,
    attributes?: Partial<UnsignedDataTransactionInterface>
  ) {
    // super();
    this.irys = irys;
    if (attributes) Object.assign(this, attributes);
  }

  get missingProperties(): string[] {
    return requiredUnsignedDataTxHeaderProps.reduce<string[]>((acc, k) => {
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
      const priceInfo = await this.irys.network.getPrice(this.dataSize, 0);
      this.permFee = priceInfo.permFee;
      this.termFee = priceInfo.termFee;
    } else {
      const priceInfo = await this.irys.network.getPrice(
        this.dataSize,
        this.ledgerId
      );
      this.termFee = priceInfo.termFee;
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
    const apiAnchor = await this.irys.network.getAnchor();
    this.anchor = apiAnchor.blockHash;
    return this;
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(
        `Missing required properties: ${missing.join(
          ", "
        )} - did you call tx.prepareChunks(<data>)?`
      );
  }

  public async sign(key: SigningKey | string): Promise<SignedDataTransaction> {
    const signingKey =
      typeof key === "string"
        ? new SigningKey(key.startsWith("0x") ? key : `0x${key}`) // ethers requires the 0x prefix
        : key;
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
    this.id = encodeBase58(toFixedUint8Array(idBytes, 32));

    return new SignedDataTransaction(
      this.irys,
      this as any as SignedDataTransactionInterface
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
        // BE VERY CAREFUL ABOUT HOW WE SERIALIZE AND DESERIALIZE
        // note: `undefined`/nullish and 0 serialize to the same thing
        // this is notable for `bundleFormat` and `permFee`
        const fields: Input = [
          this.version,
          this.anchor,
          this.signer,
          this.dataRoot,
          this.dataSize,
          this.headerSize,
          this.termFee,
          this.ledgerId,
          this.chainId,
        ];

        // Add optional fields only if they are defined
        // note: encode handles null/undefined fields
        fields.push(this.bundleFormat);
        fields.push(this.permFee);
        const encoded = encode(fields);
        const prehash = getBytes(keccak256(encoded));

        return Promise.resolve(prehash);

      default:
        throw new Error(`Unknown transaction version : ${this.version}`);
    }
  }
}

export class SignedDataTransaction
  // extends UnsignedDataTransaction
  implements SignedDataTransactionInterface
{
  public id!: TransactionId;
  public version!: number;
  public anchor!: H256;
  public signer!: Address;
  public dataRoot!: H256;
  public dataSize!: bigint;
  public termFee!: U64;
  public ledgerId!: U32;
  public chainId!: U64;
  public headerSize!: U64;
  public bundleFormat?: U64 = undefined;
  public permFee?: U64 = undefined;
  public signature!: Signature;
  public irys: IrysClient;
  public chunks: Chunks | undefined;

  public constructor(
    irys: IrysClient,
    attributes: SignedDataTransactionInterface
  ) {
    // super();
    this.irys = irys;
    // safer than object.assign, given we will be getting passed a class instance
    // this should "copy" over all header properties & chunks
    for (const k of fullSignedDataTxProps) {
      const v = attributes[k as keyof SignedDataTransactionInterface];
      if (v === undefined && requiredSignedDataTxHeaderProps.includes(k))
        throw new Error(
          `Unable to build signed transaction - missing field ${k}`
        );
      this[k as keyof this] = v as any;
    }
  }

  get missingProperties(): string[] {
    return requiredSignedDataTxHeaderProps.reduce<string[]>((acc, k) => {
      if (this[k as keyof this] === undefined) acc.push(k);
      return acc;
    }, []);
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(`Missing required properties: ${missing.join(", ")}`);
  }

  public getHeader(): SignedDataTransactionInterface {
    return fullSignedDataTxHeaderProps.reduce<Record<string, any>>((acc, k) => {
      acc[k as keyof SignedDataTransactionInterface] = this[k as keyof this];
      return acc;
    }, {}) as SignedDataTransactionInterface;
  }

  // if you want the encoded header without chunks, use `this.encode(false)`
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public toJSON(): string {
    return JSON.stringify(this.encode(true));
  }

  get txId(): string {
    return this.id;
  }

  // prepares some data into chunks, associating them with this transaction instance
  // note: this will *consume any provided async iterable* - you will need to provide a second instance for the `uploadChunks` function
  // if your data is small enough, I recommend converting it to a buffer/Uint8Array beforehand
  public async prepareChunks(data: Data): Promise<this> {
    const { chunks, dataSize } =
      await this.irys.merkle.generateTransactionChunks(data);
    this.chunks = chunks;

    if (this.dataSize !== BigInt(dataSize))
      throw new Error("regenerated chunks dataSize mismatch");
    if (
      !arrayCompare(this.dataRoot, toFixedUint8Array(this.chunks.dataRoot, 32))
    )
      throw new Error("regenerated chunks dataRoot mismatch");
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public encode(withChunks = false): EncodedSignedDataTransactionInterface {
    return {
      id: this.id,
      version: this.version,
      anchor: encodeBase58(this.anchor),
      signer: encodeBase58(this.signer),
      dataRoot: encodeBase58(this.dataRoot),
      dataSize: this.dataSize.toString(),
      headerSize: this.headerSize.toString(),
      termFee: this.termFee.toString(),
      ledgerId: this.ledgerId,
      chainId: this.chainId.toString(),
      signature: encodeBase58(this.signature),
      bundleFormat: this.bundleFormat?.toString(),
      permFee: this.permFee?.toString(),
      // TODO: add chunk serialization?
      chunks: withChunks ? JSON.stringify(this.chunks) : undefined,
    };
  }

  public static decode(
    irys: IrysClient,
    encoded: EncodedSignedDataTransactionInterface
  ): SignedDataTransaction {
    return new SignedDataTransaction(irys, {
      id: encoded.id,
      version: encoded.version,
      anchor: decodeBase58ToFixed(encoded.anchor, 32),
      signer: decodeBase58ToFixed(encoded.signer, 20),
      dataRoot: decodeBase58ToFixed(encoded.dataRoot, 32),
      dataSize: BigInt(encoded.dataSize),
      headerSize: BigInt(encoded.headerSize),
      termFee: BigInt(encoded.termFee),
      ledgerId: encoded.ledgerId,
      chainId: BigInt(encoded.chainId),
      signature: decodeBase58ToFixed(encoded.signature, 65),
      bundleFormat: encoded.bundleFormat
        ? BigInt(encoded.bundleFormat)
        : undefined,
      permFee: encoded.permFee ? BigInt(encoded.permFee) : undefined,
      chunks: encoded.chunks ? JSON.parse(encoded.chunks) : undefined,
    });
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

  // Uploads the transaction's header and chunks
  public async upload(
    data: Data,
    opts?: {
      retry?: AsyncRetry.Options;
      concurrency?: number;
      onProgress?: (idx: number) => void;
    }
  ): Promise<AxiosResponse> {
    const headerRes = await this.uploadHeader(opts);
    await this.uploadChunks(data, opts);
    return headerRes;
  }

  public async uploadHeader(
    apiConfig?: ApiRequestConfig
  ): Promise<AxiosResponse> {
    return await this.irys.api.post(
      V1_API_ROUTES.POST_DATA_TX_HEADER,
      this.toJSON(),
      {
        ...apiConfig,
        headers: { "Content-Type": "application/json" },
        validateStatus: (s) => s < 400,
      }
    );
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
            const res = await this.irys.api.post(
              V1_API_ROUTES.POST_CHUNK,
              serializedChunk,
              {
                headers: { "Content-Type": "application/json" },
              }
            );
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
          this.headerSize,
          this.termFee,
          this.ledgerId,
          this.chainId,
        ];

        // Add optional fields only if they are defined
        // note: encode handles null/undefined fields
        fields.push(this.bundleFormat);
        fields.push(this.permFee);

        const encoded = encode(fields);
        const prehash = getBytes(keccak256(encoded));

        return Promise.resolve(prehash);

      default:
        throw new Error(`Unknown transaction version : ${this.version}`);
    }
  }
}
