"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUrl = exports.normalizeUrl = exports.API_VERSIONS = exports.BlockTag = exports.V1_API_ROUTES = exports.isApiConfig = void 0;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importStar(require("axios"));
const node_http_1 = tslib_1.__importDefault(require("node:http"));
const node_https_1 = tslib_1.__importDefault(require("node:https"));
const async_retry_1 = tslib_1.__importDefault(require("async-retry"));
const ethers_1 = require("ethers");
const HTTP_STATUS = {
    BAD_REQUEST: 400,
    REQUEST_TIMEOUT: 408,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
};
const isApiConfig = (o) => typeof o !== "string" && "url" in o;
exports.isApiConfig = isApiConfig;
// This exists primarily to make route/API changes a lot easier
// eslint-disable-next-line @typescript-eslint/naming-convention
var V1_API_ROUTES;
(function (V1_API_ROUTES) {
    V1_API_ROUTES["GET_TX_HEADER"] = "/v1/tx/#";
    V1_API_ROUTES["GET_PROMOTION_STATUS"] = "/v1/tx/#/promotion-status";
    V1_API_ROUTES["GET_NETWORK_CONFIG"] = "/v1/network/config";
    V1_API_ROUTES["GET_INFO"] = "/";
    V1_API_ROUTES["EXECUTION_RPC"] = "/v1/execution-rpc";
    V1_API_ROUTES["GET_LOCAL_DATA_START_OFFSET"] = "/v1/tx/#/local/data-start-offset";
    V1_API_ROUTES["GET_TX"] = "/v1/tx/{txId}";
    V1_API_ROUTES["GET_BLOCK"] = "/v1/block/{blockParam}";
    V1_API_ROUTES["GET_TX_PRICE"] = "/v1/price/{ledgerId}/{size}";
    V1_API_ROUTES["POST_DATA_TX_HEADER"] = "/v1/tx";
    V1_API_ROUTES["POST_COMMITMENT_TX_HEADER"] = "/v1/commitment-tx";
    V1_API_ROUTES["POST_CHUNK"] = "/v1/chunk";
    V1_API_ROUTES["GET_COMMITMENT_PRICE"] = "/v1/price/commitment/{type}/{userAddress}";
    V1_API_ROUTES["GET_ANCHOR"] = "/v1/anchor";
    V1_API_ROUTES["GET_BLOCK_INDEX"] = "/v1/block-index?height={height}&limit={limit}";
    V1_API_ROUTES["GET_ASSIGNMENTS"] = "/v1/ledger/{address}/assignments";
})(V1_API_ROUTES || (exports.V1_API_ROUTES = V1_API_ROUTES = {}));
var BlockTag;
(function (BlockTag) {
    BlockTag["LATEST"] = "latest";
    BlockTag["PENDING"] = "pending";
    BlockTag["FINALIZED"] = "finalized";
})(BlockTag || (exports.BlockTag = BlockTag = {}));
exports.API_VERSIONS = ["v1"];
class Api {
    constructor(config) {
        this.cookieMap = new Map();
        if (config)
            this.applyConfig(config);
    }
    get executionRpcUrl() {
        return buildUrl(this.config.url, [V1_API_ROUTES.EXECUTION_RPC]);
    }
    get rpcProvider() {
        this.rpcInstance ??= new ethers_1.JsonRpcProvider(this.executionRpcUrl.toString());
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
        return {
            ...config,
            url: normalizeUrl(config.url),
            timeout: config.timeout ?? 20000,
            logging: config.logging ?? false,
            logger: config.logger ?? console.log,
            headers: config.headers ?? {},
            withCredentials: config.withCredentials ?? false,
            retry: { retries: 3, maxTimeout: 5_000, ...config.retry },
            maxSockets: config.maxSockets ?? 50,
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
        const maxSockets = this.config.maxSockets ?? 50;
        const httpAgent = new node_http_1.default.Agent({ keepAlive: true, maxSockets });
        const httpsAgent = new node_https_1.default.Agent({ keepAlive: true, maxSockets });
        const instance = axios_1.default.create({
            baseURL: this.config.url.toString(),
            timeout: this.config.timeout,
            maxContentLength: 1024 * 1024 * 512,
            headers: this.config.headers,
            withCredentials: this.config.withCredentials,
            httpAgent,
            httpsAgent,
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
        return (0, async_retry_1.default)(async (bail) => {
            try {
                return await instance({ ...config, url });
            }
            catch (error) {
                const status = error instanceof axios_1.AxiosError ? error.response?.status : undefined;
                const isClientError = status !== undefined &&
                    status >= HTTP_STATUS.BAD_REQUEST &&
                    status < HTTP_STATUS.INTERNAL_SERVER_ERROR;
                const isRetryableClientError = status === HTTP_STATUS.REQUEST_TIMEOUT ||
                    status === HTTP_STATUS.TOO_MANY_REQUESTS;
                if (isClientError && !isRetryableClientError) {
                    bail(error);
                    return undefined;
                }
                throw error;
            }
        }, {
            ...this.config.retry,
            ...config?.retry,
        });
    }
}
exports.default = Api;
function normalizeUrl(url) {
    const pathComponents = url.pathname.split("/");
    // strip the "v<number>" suffix if it exists - the client implementation decides what version to use
    if (/v[0-9]+$/.test(url.pathname.split("/").at(-1) ?? ""))
        pathComponents.pop();
    return buildUrl(new URL(url.origin), [...pathComponents]);
}
exports.normalizeUrl = normalizeUrl;
function buildUrl(base, paths) {
    // Remove leading/trailing slashes and filter out empty parts
    const cleanParts = [base.pathname]
        .concat(paths)
        .map((part) => part.replace(/^\/+|\/+$/g, ""))
        .filter(Boolean);
    return new URL(cleanParts.join("/"), base.origin);
}
exports.buildUrl = buildUrl;
//# sourceMappingURL=api.js.map