import type { AxiosResponse } from "axios";
import type Api from "./api";
import type { ApiRequestConfig, BlockParam } from "./api";
import type { Address, Base58, BlockHash, EpochTimestamp, H256, U256, U32, U64, U8, UTF8 } from "./dataTypes";
import type { EncodedStorageConfigInterface } from "./storageConfig";
import type { CommitmentType } from "./commitmentTransaction";
export declare class Network {
    api: Api;
    constructor(api: Api);
    getStorageConfig(config?: ApiRequestConfig): Promise<EncodedStorageConfigInterface>;
    getHeight(config?: ApiRequestConfig): Promise<U64>;
    getInfo(config?: ApiRequestConfig): Promise<EncodedInfoInterface>;
    getLatestBlock(withPoa?: boolean, config?: ApiRequestConfig): Promise<AxiosResponse<EncodedCombinedBlockHeader>>;
    getBlock(param: BlockParam, withPoa?: boolean, config?: ApiRequestConfig): Promise<AxiosResponse<EncodedCombinedBlockHeader>>;
    getAnchor(config?: ApiRequestConfig): Promise<AnchorInfo>;
    getPrice(size: number | bigint, ledgerId?: bigint | number, config?: ApiRequestConfig): Promise<PriceInfo>;
    getCommitmentPrice(address: Address, type: CommitmentType, config?: ApiRequestConfig): Promise<PledgePriceInfo | StakePriceInfo>;
    getBlockIndex(fromHeight: number | U64, pageSize?: number, config?: ApiRequestConfig): Promise<EncodedBlockIndexEntry[]>;
}
export type EncodedBlockIndexEntry = {
    blockHash: Base58<BlockHash>;
    numLedgers: U8;
    ledgers: EncodedLedgerIndexItem[];
};
export type EncodedLedgerIndexItem = {
    totalChunks: UTF8<U64>;
    txRoot: Base58<H256>;
};
export type EncodedAnchorInfo = {
    blockHash: Base58<BlockHash>;
};
export type AnchorInfo = {
    blockHash: BlockHash;
};
export type StakePriceInfo = {
    value: U256;
    fee: U256;
};
export type PledgePriceInfo = StakePriceInfo & {
    userAddress: Address;
    pledgeCount: U64;
};
export type EncodedStakePriceInfo = {
    value: UTF8<U256>;
    fee: UTF8<U256>;
};
export type EncodedPledgePriceInfo = EncodedStakePriceInfo & {
    userAddress: Base58<Address>;
    pledgeCount: UTF8<U64>;
};
export type EncodedCombinedBlockHeader = {
    blockHash: UTF8<BlockHash>;
};
export type EncodedInfoInterface = {
    version: string;
    peerCount: number;
    chainId: UTF8<U64>;
    height: UTF8<U64>;
    blockHash: Base58<H256>;
    blockIndexHeight: UTF8<U64>;
    blockIndexHash: Base58<H256>;
    pendingBlocks: UTF8<U64>;
    isSyncing: boolean;
    currentSyncHeight: UTF8<U64>;
    uptimeSecs: UTF8<EpochTimestamp>;
    miningAddress: Base58<Address>;
};
export type EncodedPriceInfo = {
    permFee: UTF8<U256>;
    termFee: UTF8<U256>;
    ledger: UTF8<U32>;
    bytes: UTF8<U64>;
};
export type PriceInfo = {
    permFee: U256;
    termFee: U256;
    ledger: U32;
    bytes: U64;
};
