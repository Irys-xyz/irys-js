import type { AxiosResponse } from "axios";
import type Api from "./api.js";
import type { Address, Base58, BlockHash, H256, U256, U32, U64, UTF8 } from "./dataTypes.js";
import type { EncodedStorageConfigInterface } from "./storageConfig.js";
export declare class Network {
    api: Api;
    constructor(api: Api);
    getStorageConfig(): Promise<EncodedStorageConfigInterface>;
    getHeight(): Promise<number>;
    getInfo(): Promise<EncodedInfoInterface>;
    getLatestBlock(): Promise<AxiosResponse<EncodedLatestBlock>>;
    getAnchor(): Promise<AnchorInfo>;
    getPrice(size: number | bigint, ledgerId?: bigint | number): Promise<PriceInfo>;
    getPledgePrice(address: Address): Promise<PledgePriceInfo>;
}
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
export type EncodedLatestBlock = {
    blockHash: UTF8<BlockHash>;
};
export type EncodedInfoInterface = {
    version: string;
    peerCount: number;
    chainId: number;
    height: number;
    blockHash: Base58<H256>;
    blockIndexHeight: number;
    blocks: number;
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
