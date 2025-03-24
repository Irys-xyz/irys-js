import type { Address, H256, Signature, U32, U64, U8 } from "./dataTypes.js";
import { type MerkleChunk, type MerkleProof } from "./merkle.js";
import { SigningKey } from "ethers";
import { UnpackedChunk } from "./chunk.js";
import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys.js";
import type { Data } from "./types.js";
import AsyncRetry from "async-retry";
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
export type SignedTransactionInterface = UnsignedTransactionInterface & SignedTransactionSubInterface;
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
export declare class UnsignedTransaction implements Partial<UnsignedTransactionInterface> {
    version: number;
    protected id?: H256;
    anchor?: H256;
    signer?: Address;
    dataRoot?: H256;
    dataSize: bigint;
    termFee?: U64;
    chainId?: U64;
    protected signature?: Signature;
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
    id: H256;
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
    chunks: Chunks;
    constructor(irys: IrysClient, attributes: SignedTransactionInterface);
    get missingProperties(): string[];
    throwOnMissing(): void;
    getHeader(): SignedTransactionInterface;
    getHeaderSerialized(): string;
    get txId(): string;
    get header(): {
        id: string;
        version: number;
        anchor: string;
        signer: string;
        dataRoot: string;
        dataSize: bigint;
        termFee: bigint;
        ledgerId: number;
        chainId: bigint;
        signature: string;
        bundleFormat: bigint | undefined;
        permFee: bigint | undefined;
    };
    getChunk(idx: number, fullData: Uint8Array): Promise<UnpackedChunk>;
    getChunkPassthrough(idx: number, data: Uint8Array): Promise<UnpackedChunk>;
    uploadHeader(): Promise<AxiosResponse>;
    uploadChunks(data: Data, opts?: {
        retry?: AsyncRetry.Options;
        concurrency?: number;
        onProgress?: (idx: number) => void;
    }): Promise<void>;
    validateSignature(): Promise<boolean>;
    getSignatureData(): Promise<Uint8Array>;
}
