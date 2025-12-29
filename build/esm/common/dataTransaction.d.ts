import type { Address, Base58, H256, Signature, TransactionId, U256, U32, U64, U8, UTF8 } from "./dataTypes.js";
import type { MerkleChunk, MerkleProof } from "./merkle.js";
import { SigningKey } from "ethers";
import { UnpackedChunk } from "./chunk.js";
import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys.js";
import type { Data } from "./types.js";
import AsyncRetry from "async-retry";
import { type ApiRequestConfig } from "./api.js";
export type DataTransactionInterface = UnsignedDataTransactionInterface | SignedDataTransactionInterface;
export declare enum DataLedgerId {
    PUBLISH = 0,
    SUBMIT = 1
}
export type UnsignedDataTransactionInterface = {
    version: DataTransactionVersion;
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
export type SignedDataTransactionInterface = UnsignedDataTransactionInterface & {
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
export type EncodedSignedDataTransactionInterface = EncodedUnsignedDataTransactionInterface & {
    id: Base58<H256>;
    signature: Base58<Signature>;
    chunks?: UTF8<Chunks>;
};
export type Chunks = {
    dataRoot: Uint8Array;
    chunks: MerkleChunk[];
    proofs: MerkleProof[];
};
export declare class UnsignedDataTransaction implements Partial<UnsignedDataTransactionInterface> {
    version: DataTransactionVersion;
    id?: TransactionId;
    anchor?: H256;
    signer?: Address;
    dataRoot?: H256;
    dataSize: U64;
    termFee: U256;
    chainId: U64;
    signature?: Signature;
    bundleFormat?: U64;
    permFee?: U256;
    ledgerId: U32;
    headerSize: U64;
    irys: IrysClient;
    chunks?: Chunks;
    constructor(irys: IrysClient, attributes?: Partial<UnsignedDataTransactionInterface>);
    get missingProperties(): string[];
    ledger(ledgerId: number | DataLedgerId): this;
    fillFee(): Promise<this>;
    getFees(): Promise<{
        termFee: U64;
        permFee: U64;
    }>;
    getFee(): Promise<U64>;
    fillAnchor(): Promise<this>;
    throwOnMissing(): void;
    sign(key: SigningKey | string): Promise<SignedDataTransaction>;
    prepareChunks(data: Data): Promise<this>;
    getSignatureData(): Promise<Uint8Array>;
}
export declare enum DataTransactionVersion {
    V1 = 1
}
export declare class SignedDataTransaction implements SignedDataTransactionInterface {
    id: TransactionId;
    version: DataTransactionVersion;
    anchor: H256;
    signer: Address;
    dataRoot: H256;
    dataSize: bigint;
    termFee: U64;
    ledgerId: U32;
    chainId: U64;
    headerSize: U64;
    bundleFormat?: U64;
    permFee?: U64;
    signature: Signature;
    irys: IrysClient;
    chunks: Chunks | undefined;
    constructor(irys: IrysClient, attributes: SignedDataTransactionInterface);
    get missingProperties(): string[];
    throwOnMissing(): void;
    getHeader(): SignedDataTransactionInterface;
    toJSON(): string;
    get txId(): string;
    prepareChunks(data: Data): Promise<this>;
    encode(withChunks?: boolean): EncodedSignedDataTransactionInterface;
    static decode(irys: IrysClient, encoded: EncodedSignedDataTransactionInterface): SignedDataTransaction;
    getChunk(idx: number, fullData: Uint8Array): Promise<UnpackedChunk>;
    getChunkPassthrough(idx: number, data: Uint8Array): Promise<UnpackedChunk>;
    upload(data: Data, opts?: {
        retry?: AsyncRetry.Options;
        concurrency?: number;
        onProgress?: (idx: number) => void;
    }): Promise<AxiosResponse>;
    uploadHeader(apiConfig?: ApiRequestConfig): Promise<AxiosResponse>;
    uploadChunks(data: Data, opts?: {
        retry?: AsyncRetry.Options;
        concurrency?: number;
        onProgress?: (idx: number) => void;
    }): Promise<void>;
    validateSignature(): Promise<boolean>;
    getSignatureData(): Promise<Uint8Array>;
}
