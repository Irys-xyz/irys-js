import type { AxiosResponse } from "axios";
import type Api from "./api";
import { type ApiRequestConfig } from "./api";
import type { TransactionId, U64, UTF8 } from "./dataTypes";
import type { EncodedSignedTransactionInterface } from "./transaction";
export type LocalDataStartEncoded = {
    dataStartOffset: UTF8<U64>;
};
export declare class StorageTransactions {
    api: Api;
    constructor(api: Api);
    getHeader(txId: TransactionId, config?: ApiRequestConfig): Promise<AxiosResponse<EncodedSignedTransactionInterface>>;
    /**
     * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
     */
    getLocalDataStartOffset(txId: TransactionId, config?: ApiRequestConfig): Promise<AxiosResponse<LocalDataStartEncoded>>;
    /**
     * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
     */
    getPromotionStatus(txId: TransactionId, config?: ApiRequestConfig): Promise<PromotionStatus>;
    protected getTxId<T>(txId: TransactionId, route: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>;
}
export declare enum PromotionStatus {
    NOT_FOUND = 0,
    NOT_PROMOTED = 1,
    PROMOTED = 2
}
