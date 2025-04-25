import type { Address, Base58, H256, Signature, TransactionId, U32, U64, U8, UTF8 } from "./dataTypes";
import { type MerkleChunk, type MerkleProof } from "./merkle";
import { SigningKey } from "ethers";
import { UnpackedChunk } from "./chunk";
import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import type { Data } from "./types";
import AsyncRetry from "async-retry";
import { type ApiRequestConfig } from "./api";
export type TransactionInterface = UnsignedTransactionInterface | SignedTransactionInterface;
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
export type SignedTransactionInterface = UnsignedTransactionInterface & {
    id: Base58;
    signature: Signature;
    chunks?: Chunks;
};
export type EncodedUnsignedTransactionInterface = {
    version: U8;
    anchor: Base58<H256>;
    signer: Base58<Address>;
    dataRoot: Base58<H256>;
    dataSize: UTF8<U64>;
    termFee: UTF8<U64>;
    ledgerId: U32;
    chainId: UTF8<U64>;
    bundleFormat?: UTF8<U64>;
    permFee?: UTF8<U64>;
};
export type EncodedSignedTransactionInterface = EncodedUnsignedTransactionInterface & {
    id: Base58<H256>;
    signature: Base58<Signature>;
    chunks?: UTF8<Chunks>;
};
export type Chunks = {
    dataRoot: Uint8Array;
    chunks: MerkleChunk[];
    proofs: MerkleProof[];
};
export declare class UnsignedTransaction implements Partial<UnsignedTransactionInterface> {
    version: number;
    id?: TransactionId;
    anchor?: H256;
    signer?: Address;
    dataRoot?: H256;
    dataSize: bigint;
    termFee?: U64;
    chainId?: U64;
    signature?: Signature;
    bundleFormat?: U64;
    permFee?: U64;
    ledgerId?: U32;
    irys: IrysClient;
    chunks?: Chunks;
    constructor(irys: IrysClient, attributes?: Partial<UnsignedTransactionInterface>);
    get missingProperties(): string[];
    ledger(ledgerId: number): this;
    fillFee(): Promise<this>;
    getFees(): Promise<{
        termFee: U64;
        permFee: U64;
    }>;
    getFee(): Promise<U64>;
    fillAnchor(): Promise<this>;
    throwOnMissing(): void;
    sign(key: SigningKey | string): Promise<SignedTransaction>;
    prepareChunks(data: Data): Promise<this>;
    getSignatureData(): Promise<Uint8Array>;
}
export declare class SignedTransaction implements SignedTransactionInterface {
    id: TransactionId;
    version: number;
    anchor: H256;
    signer: Address;
    dataRoot: H256;
    dataSize: bigint;
    termFee: U64;
    ledgerId: U32;
    chainId: U64;
    bundleFormat?: U64;
    permFee?: U64;
    signature: Signature;
    irys: IrysClient;
    chunks: Chunks | undefined;
    constructor(irys: IrysClient, attributes: SignedTransactionInterface);
    get missingProperties(): string[];
    throwOnMissing(): void;
    getHeader(): SignedTransactionInterface;
    toJSON(): string;
    get txId(): string;
    prepareChunks(data: Data): Promise<this>;
    encode(withChunks?: boolean): EncodedSignedTransactionInterface;
    static decode(irys: IrysClient, encoded: EncodedSignedTransactionInterface): SignedTransaction;
    getChunk(idx: number, fullData: Uint8Array): Promise<UnpackedChunk>;
    getChunkPassthrough(idx: number, data: Uint8Array): Promise<UnpackedChunk>;
    upload(data: Data, opts?: {
        retry?: AsyncRetry.Options;
        concurrency?: number;
        onProgress?: (idx: number) => void;
    }): Promise<void>;
    uploadHeader(apiConfig?: ApiRequestConfig): Promise<AxiosResponse>;
    uploadChunks(data: Data, opts?: {
        retry?: AsyncRetry.Options;
        concurrency?: number;
        onProgress?: (idx: number) => void;
    }): Promise<void>;
    validateSignature(): Promise<boolean>;
    getSignatureData(): Promise<Uint8Array>;
}
