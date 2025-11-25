/// <reference types="node" />
import type { AxiosResponse, AxiosRequestConfig, AxiosInstance } from "axios";
import AsyncRetry from "async-retry";
import { JsonRpcProvider } from "ethers";
import type { Base58, H256, U64 } from "./dataTypes.js";
export declare const isApiConfig: (o: URL | ApiConfig | string) => o is ApiConfig;
export type ApiConfig = {
    url: URL;
    timeout?: number;
    logging?: boolean;
    logger?: (msg: string) => void;
    network?: string;
    headers?: Record<string, string>;
    withCredentials?: boolean;
    retry?: AsyncRetry.Options;
};
export type ApiRequestConfig = {
    retry?: AsyncRetry.Options;
} & AxiosRequestConfig;
export declare enum V1_API_ROUTES {
    GET_TX_HEADER = "/v1/tx/#",
    GET_PROMOTION_STATUS = "/v1/tx/#/promotion_status",
    GET_STORAGE_CONFIG = "/v1/network/config",
    GET_INFO = "/",
    EXECUTION_RPC = "/v1/execution-rpc",
    GET_LOCAL_DATA_START_OFFSET = "/v1/tx/#/local/data_start_offset",
    GET_BLOCK = "/v1/block/{blockParam}",
    GET_TX_PRICE = "/v1/price/{ledgerId}/{size}",
    POST_DATA_TX_HEADER = "/v1/tx",
    POST_COMMITMENT_TX_HEADER = "/v1/commitment_tx",
    POST_CHUNK = "/v1/chunk",
    GET_COMMITMENT_PRICE = "/v1/price/commitment/{type}/{userAddress}",
    GET_ANCHOR = "/v1/anchor",
    GET_BLOCK_INDEX = "/v1/block_index?height={height}&limit={limit}"
}
export declare enum BlockTag {
    LATEST = "latest",
    PENDING = "pending",
    FINALIZED = "finalized"
}
export type BlockParam = number | Base58<H256> | U64 | BlockTag;
export declare const API_VERSIONS: string[];
export default class Api {
    protected _instance?: AxiosInstance;
    protected rpcInstance?: JsonRpcProvider;
    cookieMap: Map<any, any>;
    config: ApiConfig;
    constructor(config?: ApiConfig);
    get executionRpcUrl(): URL;
    get rpcProvider(): JsonRpcProvider;
    applyConfig(config: ApiConfig): void;
    getConfig(): ApiConfig;
    private requestInterceptor;
    private responseInterceptor;
    private mergeDefaults;
    get<T = any>(path: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(path: string, body: Buffer | string | object | null, config?: ApiRequestConfig): Promise<AxiosResponse<T>>;
    get instance(): AxiosInstance;
    request<T = any>(path: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>;
}
export declare function normalizeUrl(url: URL): URL;
export declare function buildUrl(base: URL, paths: string[]): URL;
