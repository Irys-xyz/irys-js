import type { AxiosResponse } from "axios";
import type Api from "./api";
import { V1_API_ROUTES, type ApiRequestConfig } from "./api";
import type { TransactionId, U64, UTF8 } from "./dataTypes";
import type { EncodedSignedDataTransactionInterface } from "./dataTransaction";

export type LocalDataStartEncoded = {
  dataStartOffset: UTF8<U64>;
};

export class StorageTransactions {
  public api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  async getHeader(
    txId: TransactionId,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<EncodedSignedDataTransactionInterface>> {
    return this.getTxId(txId, V1_API_ROUTES.GET_TX_HEADER, config);
  }

  /**
   * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
   */
  async getLocalDataStartOffset(
    txId: TransactionId,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<LocalDataStartEncoded>> {
    return this.getTxId(
      txId,
      V1_API_ROUTES.GET_LOCAL_DATA_START_OFFSET,
      config
    );
  }

  /**
   * @deprecated this method WILL BE REMOVED/CHANGED, DO NOT RELY ON IT
   */
  async getPromotionStatus(
    txId: TransactionId,
    config?: ApiRequestConfig
  ): Promise<PromotionStatus> {
    const res = await this.getTxId<PromotionStatus>(
      txId,
      V1_API_ROUTES.GET_PROMOTION_STATUS,
      config
    );
    return res.data;
  }

  protected getTxId<T>(
    txId: TransactionId,
    route: string,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.api.get(route.replace("#", txId), config);
  }
}

export type PromotionStatus = {
  promotionHeight?: U64;
};
