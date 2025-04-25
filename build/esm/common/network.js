import { V1_API_ROUTES } from "./api.js";
import { Utils } from "./utilities.js";
export class Network {
    api;
    constructor(api) {
        this.api = api;
    }
    async getStorageConfig() {
        return (await this.api.get(V1_API_ROUTES.GET_STORAGE_CONFIG)).data;
    }
    async getHeight() {
        return this.getInfo().then((r) => r.blockIndexHeight);
    }
    async getInfo() {
        return this.api
            .get(V1_API_ROUTES.GET_INFO)
            .then((r) => r.data);
    }
    async getLatestBlock() {
        return this.api.get(V1_API_ROUTES.GET_LATEST_BLOCK);
    }
    async getPrice(size, ledgerId = 0) {
        return BigInt((await Utils.checkAndThrow(this.api.get(V1_API_ROUTES.GET_TX_PRICE.replace("{ledgerId}", ledgerId.toString()).replace("{size}", size.toString())), "getting price for transaction")).data.costInIrys);
    }
}
//# sourceMappingURL=network.js.map