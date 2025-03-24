/// <reference types="node" />
import type { AxiosResponse, AxiosRequestConfig, AxiosInstance } from "axios";
import AsyncRetry from "async-retry";
import { JsonRpcProvider } from "ethers";
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
export declare function buildUrl(base: URL, parts: string[]): URL;
