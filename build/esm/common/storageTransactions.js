import { V1_API_ROUTES } from "./api.js";
export class StorageTransactions {
    api;
    constructor(api) {
        this.api = api;
    }
    async getHeader(txId, config) {
        return this.getTxId(txId, V1_API_ROUTES.GET_TX_HEADER, config);
    }
    /**
     * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
     */
    async getLocalDataStartOffset(txId, config) {
        return this.getTxId(txId, V1_API_ROUTES.GET_LOCAL_DATA_START_OFFSET, config);
    }
    /**
     * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
     */
    async getPromotionStatus(txId, config) {
        const res = await this.getTxId(txId, V1_API_ROUTES.GET_PROMOTION_STATUS, config);
        return res.data;
    }
    getTxId(txId, route, config) {
        return this.api.get(route.replace("#", txId), config);
    }
}
//# sourceMappingURL=storageTransactions.js.map