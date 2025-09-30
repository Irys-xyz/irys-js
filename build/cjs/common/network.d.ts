import { AxiosResponse } from "axios";
import type Api from "./api";
import type { Base58, BlockHash, H256, UTF8 } from "./dataTypes";
import type { EncodedStorageConfigInterface } from "./storageConfig";
export declare class Network {
    api: Api;
    constructor(api: Api);
    getStorageConfig(): Promise<EncodedStorageConfigInterface>;
    getHeight(): Promise<number>;
    getInfo(): Promise<EncodedInfoInterface>;
    getLatestBlock(): Promise<AxiosResponse<EncodedLatestBlock>>;
    getPrice(size: number | bigint, ledgerId?: bigint | number): Promise<bigint>;
}
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
