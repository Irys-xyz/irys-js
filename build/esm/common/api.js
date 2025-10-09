import Axios from "axios";
import AsyncRetry from "async-retry";
import { JsonRpcProvider } from "ethers";
export const isApiConfig = (o) => typeof o !== "string" && "url" in o;
// This exists primarily to make route/API changes a lot easier
// eslint-disable-next-line @typescript-eslint/naming-convention
export var V1_API_ROUTES;
(function (V1_API_ROUTES) {
    V1_API_ROUTES["GET_TX_HEADER"] = "/v1/tx/#";
    V1_API_ROUTES["GET_PROMOTION_STATUS"] = "/v1/tx/#/promotion_status";
    V1_API_ROUTES["GET_STORAGE_CONFIG"] = "/v1/network/config";
    V1_API_ROUTES["GET_INFO"] = "/";
    V1_API_ROUTES["EXECUTION_RPC"] = "/v1/execution-rpc";
    V1_API_ROUTES["GET_LOCAL_DATA_START_OFFSET"] = "/v1/tx/#/local/data_start_offset";
    V1_API_ROUTES["GET_LATEST_BLOCK"] = "/v1/block/latest";
    V1_API_ROUTES["GET_TX_PRICE"] = "/v1/price/{ledgerId}/{size}";
    V1_API_ROUTES["POST_DATA_TX_HEADER"] = "/v1/tx";
    V1_API_ROUTES["POST_COMMITMENT_TX_HEADER"] = "/v1/commitment_tx";
    V1_API_ROUTES["POST_CHUNK"] = "/v1/chunk";
    V1_API_ROUTES["GET_COMMITMENT_PRICE"] = "/v1/price/commitment/{type}/{userAddress}";
    V1_API_ROUTES["GET_ANCHOR"] = "/v1/anchor";
})(V1_API_ROUTES || (V1_API_ROUTES = {}));
export const API_VERSIONS = ["v1"];
export default class Api {
    _instance;
    rpcInstance;
    cookieMap = new Map();
    config;
    constructor(config) {
        if (config)
            this.applyConfig(config);
    }
    get executionRpcUrl() {
        return buildUrl(this.config.url, [V1_API_ROUTES.EXECUTION_RPC]);
    }
    get rpcProvider() {
        this.rpcInstance ??= new JsonRpcProvider(this.executionRpcUrl.toString());
        return this.rpcInstance;
    }
    applyConfig(config) {
        this.config = this.mergeDefaults(config);
        this._instance = undefined;
    }
    getConfig() {
        return this.config;
    }
    async requestInterceptor(request) {
        const cookies = this.cookieMap.get(new URL(request.baseURL ?? "").host);
        if (cookies)
            request.headers.cookie = cookies;
        return request;
    }
    async responseInterceptor(response) {
        const setCookie = response.headers?.["set-cookie"];
        if (setCookie)
            this.cookieMap.set(response.request.host, setCookie);
        return response;
    }
    mergeDefaults(config) {
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
    async get(path, config) {
        try {
            return await this.request(path, { ...config, method: "GET" });
        }
        catch (error) {
            if (error.response?.status)
                return error.response;
            throw error;
        }
    }
    async post(path, body, config) {
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
        }
        catch (error) {
            if (error.response?.status)
                return error.response;
            throw error;
        }
    }
    get instance() {
        if (this._instance)
            return this._instance;
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
                this.config.logger(`Requesting: ${request.baseURL}/${request.url}`);
                return request;
            });
            instance.interceptors.response.use((response) => {
                this.config.logger(`Response: ${response.config.url} - ${response.status}`);
                return response;
            });
        }
        return (this._instance = instance);
    }
    async request(path, config) {
        const instance = this.instance;
        const url = config?.url ?? buildUrl(this.config.url, [path]).toString();
        return AsyncRetry((_) => instance({ ...config, url }), {
            ...this.config.retry,
            ...config?.retry,
        });
    }
}
export function normalizeUrl(url) {
    const pathComponents = url.pathname.split("/");
    // strip the "v<number>" suffix if it exists - the client implementation decides what version to use
    if (/v[0-9]+$/.test(url.pathname.split("/").at(-1) ?? ""))
        pathComponents.pop();
    return buildUrl(new URL(url.origin), [...pathComponents]);
}
export function buildUrl(base, paths) {
    // Remove leading/trailing slashes and filter out empty parts
    const cleanParts = [base.pathname]
        .concat(paths)
        .map((part) => part.replace(/^\/+|\/+$/g, ""))
        .filter(Boolean);
    return new URL(cleanParts.join("/"), base.origin);
}
//# sourceMappingURL=api.js.map