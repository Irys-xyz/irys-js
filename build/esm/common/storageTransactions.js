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
        if (res.status === 404)
            return PromotionStatus.NOT_FOUND;
        return res.data === "true"
            ? PromotionStatus.PROMOTED
            : PromotionStatus.NOT_PROMOTED;
    }
    getTxId(txId, route, config) {
        return this.api.get(route.replace("#", txId), config);
    }
}
export var PromotionStatus;
(function (PromotionStatus) {
    PromotionStatus[PromotionStatus["NOT_FOUND"] = 0] = "NOT_FOUND";
    PromotionStatus[PromotionStatus["NOT_PROMOTED"] = 1] = "NOT_PROMOTED";
    PromotionStatus[PromotionStatus["PROMOTED"] = 2] = "PROMOTED";
})(PromotionStatus || (PromotionStatus = {}));
//# sourceMappingURL=storageTransactions.js.map