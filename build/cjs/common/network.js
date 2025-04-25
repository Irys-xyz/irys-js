"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
const api_1 = require("./api");
const utilities_1 = require("./utilities");
class Network {
    constructor(api) {
        this.api = api;
    }
    async getStorageConfig() {
        return (await this.api.get(api_1.V1_API_ROUTES.GET_STORAGE_CONFIG)).data;
    }
    async getHeight() {
        return this.getInfo().then((r) => r.blockIndexHeight);
    }
    async getInfo() {
        return this.api
            .get(api_1.V1_API_ROUTES.GET_INFO)
            .then((r) => r.data);
    }
    async getLatestBlock() {
        return this.api.get(api_1.V1_API_ROUTES.GET_LATEST_BLOCK);
    }
    async getPrice(size, ledgerId = 0) {
        return BigInt((await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_TX_PRICE.replace("{ledgerId}", ledgerId.toString()).replace("{size}", size.toString())), "getting price for transaction")).data.costInIrys);
    }
}
exports.Network = Network;
//# sourceMappingURL=network.js.map