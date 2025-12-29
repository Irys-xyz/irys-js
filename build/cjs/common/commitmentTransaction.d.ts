import type { Address, Base58, FixedUint8Array, H256, Signature, TransactionId, U256, U64, UTF8 } from "./dataTypes";
import { SigningKey } from "ethers";
import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import { type ApiRequestConfig } from "./api";
export type CommitmentTransactionInterface = UnsignedCommitmentTransactionInterface | SignedCommitmentTransactionInterface;
export type UnsignedCommitmentTransactionInterface = {
    version: CommitmentTransactionVersion;
    anchor: H256;
    signer: Address;
    commitmentType: CommitmentType;
    chainId: U64;
    fee: U64;
    value: U256;
};
export type SignedCommitmentTransactionInterface = UnsignedCommitmentTransactionInterface & {
    id: Base58;
    signature: Signature;
};
export type EncodedUnsignedCommitmentTransactionInterface = {
    version: CommitmentTransactionVersion;
    anchor: Base58<H256>;
    signer: Base58<Address>;
    chainId: UTF8<U64>;
    fee: UTF8<U64>;
    value: UTF8<U256>;
    commitmentType: EncodedCommitmentType;
};
export type EncodedSignedCommitmentTransactionInterface = EncodedUnsignedCommitmentTransactionInterface & {
    id: Base58<H256>;
    signature: Base58<Signature>;
};
export declare enum CommitmentTypeId {
    STAKE = 1,
    PLEDGE = 2,
    UNPLEDGE = 3,
    UNSTAKE = 4
}
export declare enum EncodedCommitmentTypeId {
    STAKE = "stake",
    PLEDGE = "pledge",
    UNPLEDGE = "unpledge",
    UNSTAKE = "unstake"
}
export type CommitmentType = {
    type: CommitmentTypeId.STAKE | CommitmentTypeId.UNSTAKE;
} | {
    type: CommitmentTypeId.PLEDGE;
    pledgeCountBeforeExecuting: U64;
} | {
    type: CommitmentTypeId.UNPLEDGE;
    pledgeCountBeforeExecuting: U64;
    partitionHash: H256;
};
export type EncodedCommitmentType = {
    type: EncodedCommitmentTypeId.STAKE | EncodedCommitmentTypeId.UNSTAKE;
} | {
    type: EncodedCommitmentTypeId.PLEDGE;
    pledgeCountBeforeExecuting: UTF8<U64>;
} | {
    type: EncodedCommitmentTypeId.UNPLEDGE;
    pledgeCountBeforeExecuting: UTF8<U64>;
    partitionHash: Base58<H256>;
};
export declare function encodeCommitmentType(type: CommitmentType): EncodedCommitmentType;
export declare function signingEncodeCommitmentType(type: CommitmentType): number | bigint | Uint8Array | (number | bigint | Uint8Array)[];
export declare enum CommitmentTransactionVersion {
    V2 = 2
}
export declare function decodeBase58ToFixedNullish<N extends number>(string: Base58 | undefined, length: N): FixedUint8Array<N> | undefined;
export declare class UnsignedCommitmentTransaction implements Partial<UnsignedCommitmentTransactionInterface> {
    version: CommitmentTransactionVersion;
    id?: TransactionId;
    anchor?: H256;
    signer?: Address;
    commitmentType?: CommitmentType;
    fee: U64;
    chainId: U64;
    signature?: Signature;
    value: U256;
    irys: IrysClient;
    constructor(irys: IrysClient, attributes?: Partial<UnsignedCommitmentTransactionInterface>);
    isSigned(): boolean;
    toJSON(): string;
    encode(): Partial<EncodedUnsignedCommitmentTransactionInterface>;
    static decode(irys: IrysClient, encoded: Partial<EncodedUnsignedCommitmentTransactionInterface>): UnsignedCommitmentTransaction;
    get missingProperties(): string[];
    fillFee(): Promise<this>;
    fillAnchor(): Promise<this>;
    throwOnMissing(): void;
    sign(key: SigningKey | string): Promise<SignedCommitmentTransaction>;
    getSignatureData(): Promise<Uint8Array>;
}
export declare class SignedCommitmentTransaction implements SignedCommitmentTransactionInterface {
    version: CommitmentTransactionVersion;
    id: TransactionId;
    anchor: H256;
    signer: Address;
    commitmentType: CommitmentType;
    fee: U64;
    chainId: U64;
    signature: Signature;
    value: U256;
    irys: IrysClient;
    constructor(irys: IrysClient, attributes: SignedCommitmentTransactionInterface);
    get missingProperties(): string[];
    isSigned(): boolean;
    throwOnMissing(): void;
    getHeader(): SignedCommitmentTransactionInterface;
    toJSON(): string;
    get txId(): string;
    encode(): EncodedSignedCommitmentTransactionInterface;
    static decode(irys: IrysClient, encoded: EncodedSignedCommitmentTransactionInterface): SignedCommitmentTransaction;
    upload(apiConfig?: ApiRequestConfig): Promise<AxiosResponse>;
    validateSignature(): Promise<boolean>;
    getSignatureData(): Promise<Uint8Array>;
}
export declare function getOrThrowIfNullish<T, K extends keyof T & string>(obj: T, key: K, msg?: string): Exclude<T[K], undefined | null>;
