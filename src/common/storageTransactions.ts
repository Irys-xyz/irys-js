import type { AxiosResponse } from "axios";
import type Api from "./api";
import { V1_API_ROUTES, type ApiRequestConfig } from "./api";
import type { TransactionId, U64, UTF8 } from "./dataTypes";
import type { EncodedSignedTransactionInterface } from "./transaction";

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
  ): Promise<AxiosResponse<EncodedSignedTransactionInterface>> {
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
    const res = await this.getTxId(
      txId,
      V1_API_ROUTES.GET_PROMOTION_STATUS,
      config
    );
    if (res.status === 404) return PromotionStatus.NOT_FOUND;
    return res.data === "true"
      ? PromotionStatus.PROMOTED
      : PromotionStatus.NOT_PROMOTED;
  }

  protected getTxId<T>(
    txId: TransactionId,
    route: string,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.api.get(route.replace("#", txId), config);
  }
}

export enum PromotionStatus {
  NOT_FOUND,
  NOT_PROMOTED,
  PROMOTED,
}
