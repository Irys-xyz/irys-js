import type {
  AxiosResponse,
  AxiosRequestConfig,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import Axios from "axios";
import AsyncRetry from "async-retry";
import { JsonRpcProvider } from "ethers";

export const isApiConfig = (o: URL | ApiConfig | string): o is ApiConfig =>
  typeof o !== "string" && "url" in o;

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

// This exists primarily to make route/API changes a lot easier
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum V1_API_ROUTES {
  GET_TX_HEADER = "/v1/tx/#",
  GET_PROMOTION_STATUS = "/v1/tx/#/promotion_status",
  GET_STORAGE_CONFIG = "/v1/network/config",
  GET_INFO = "/",
  EXECUTION_RPC = "/v1/execution-rpc",
  GET_LOCAL_DATA_START_OFFSET = "/v1/tx/#/local/data_start_offset",
  GET_LATEST_BLOCK = "/v1/block/latest",
  GET_TX_PRICE = "/v1/price/{ledgerId}/{size}",
  POST_DATA_TX_HEADER = "/v1/tx",
  POST_COMMITMENT_TX_HEADER = "/v1/commitment_tx",
  POST_CHUNK = "/v1/chunk",
  GET_COMMITMENT_PRICE = "/v1/price/commitment/{type}/{userAddress}",
  GET_ANCHOR = "/v1/anchor",
}

export const API_VERSIONS = ["v1"];

export default class Api {
  protected _instance?: AxiosInstance;
  protected rpcInstance?: JsonRpcProvider;

  public cookieMap = new Map();

  public config!: ApiConfig;

  constructor(config?: ApiConfig) {
    if (config) this.applyConfig(config);
  }

  public get executionRpcUrl(): URL {
    return buildUrl(this.config.url, [V1_API_ROUTES.EXECUTION_RPC]);
  }

  public get rpcProvider(): JsonRpcProvider {
    this.rpcInstance ??= new JsonRpcProvider(this.executionRpcUrl.toString());
    return this.rpcInstance;
  }

  public applyConfig(config: ApiConfig): void {
    this.config = this.mergeDefaults(config);
    this._instance = undefined;
  }

  public getConfig(): ApiConfig {
    return this.config;
  }

  private async requestInterceptor(
    request: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> {
    const cookies = this.cookieMap.get(new URL(request.baseURL ?? "").host);
    if (cookies) request.headers!.cookie = cookies;
    return request;
  }

  private async responseInterceptor(
    response: AxiosResponse
  ): Promise<AxiosResponse> {
    const setCookie = response.headers?.["set-cookie"];
    if (setCookie) this.cookieMap.set(response.request.host, setCookie);
    return response;
  }

  private mergeDefaults(config: ApiConfig): ApiConfig {
    config.headers ??= {};
    // if (config.network && !Object.keys(config.headers).includes("x-network"))
    //   config.headers["x-network"] = config.network;

    return {
      url: normalizeUrl(config.url),
      timeout: config.timeout ?? 20000,
      logging: config.logging ?? false,
      logger: config.logger ?? console.log,
      // headers: { ...config.headers, "user-agent": `` }, // TODO: check
      withCredentials: config.withCredentials ?? false,
      retry: { retries: 3, maxTimeout: 5_000 },
    };
  }

  public async get<T = any>(
    path: string,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.request(path, { ...config, method: "GET" });
    } catch (error: any) {
      if (error.response?.status) return error.response;
      throw error;
    }
  }

  public async post<T = any>(
    path: string,
    body: Buffer | string | object | null,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.request(path, {
        data: body,
        ...config,
        method: "POST",
        retry: {
          retries: 0, // default to 0 so the user gets the actual error
          // TODO: only retry for specific status codes (non 200, 400, i.e 500, 429, etc.)
          ...config?.retry,
        },
      });
    } catch (error: any) {
      if (error.response?.status) return error.response;
      throw error;
    }
  }

  public get instance(): AxiosInstance {
    if (this._instance) return this._instance;

    const instance = Axios.create({
      baseURL: this.config.url.toString(),
      timeout: this.config.timeout,
      maxContentLength: 1024 * 1024 * 512,
      headers: this.config.headers,
      withCredentials: this.config.withCredentials,
    });

    if (this.config.withCredentials) {
      instance.interceptors.request.use(this.requestInterceptor.bind(this));
      instance.interceptors.response.use(this.responseInterceptor.bind(this));
    }

    if (this.config.logging) {
      instance.interceptors.request.use((request) => {
        this.config.logger!(`Requesting: ${request.baseURL}/${request.url}`);
        return request;
      });

      instance.interceptors.response.use((response) => {
        this.config.logger!(
          `Response: ${response.config.url} - ${response.status}`
        );
        return response;
      });
    }

    return (this._instance = instance);
  }

  public async request<T = any>(
    path: string,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<T>> {
    const instance = this.instance;
    const url = config?.url ?? buildUrl(this.config.url, [path]).toString();
    return AsyncRetry((_) => instance({ ...config, url }), {
      ...this.config.retry,
      ...config?.retry,
    });
  }
}

export function normalizeUrl(url: URL): URL {
  const pathComponents = url.pathname.split("/");
  // strip the "v<number>" suffix if it exists - the client implementation decides what version to use
  if (/v[0-9]+$/.test(url.pathname.split("/").at(-1) ?? ""))
    pathComponents.pop();
  return buildUrl(new URL(url.origin), [...pathComponents]);
}
export function buildUrl(base: URL, paths: string[]): URL {
  // Remove leading/trailing slashes and filter out empty parts
  const cleanParts = [base.pathname]
    .concat(paths)
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return new URL(cleanParts.join("/"), base.origin);
}
