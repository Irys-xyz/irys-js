"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageTransactions = void 0;
const api_1 = require("./api");
class StorageTransactions {
    constructor(api) {
        this.api = api;
    }
    async getHeader(txId, config) {
        return this.getTxId(txId, api_1.V1_API_ROUTES.GET_TX_HEADER, config);
    }
    /**
     * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
     */
    async getLocalDataStartOffset(txId, config) {
        return this.getTxId(txId, api_1.V1_API_ROUTES.GET_LOCAL_DATA_START_OFFSET, config);
    }
    /**
     * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
     */
    async getPromotionStatus(txId, config) {
        const res = await this.getTxId(txId, api_1.V1_API_ROUTES.GET_PROMOTION_STATUS, config);
        return res.data;
    }
    getTxId(txId, route, config) {
        return this.api.get(route.replace("#", txId), config);
    }
}
exports.StorageTransactions = StorageTransactions;
//# sourceMappingURL=storageTransactions.js.map