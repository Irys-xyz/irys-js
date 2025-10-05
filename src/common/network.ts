import type { AxiosResponse } from "axios";
import type Api from "./api";
import { V1_API_ROUTES } from "./api";
import type {
  Base58,
  BlockHash,
  H256,
  U256,
  U32,
  U64,
  UTF8,
} from "./dataTypes";
import type { EncodedStorageConfigInterface } from "./storageConfig";
import { Utils } from "./utilities";

export class Network {
  public api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  public async getStorageConfig(): Promise<EncodedStorageConfigInterface> {
    return (
      await this.api.get<EncodedStorageConfigInterface>(
        V1_API_ROUTES.GET_STORAGE_CONFIG
      )
    ).data;
  }

  public async getHeight(): Promise<number> {
    return this.getInfo().then((r) => r.blockIndexHeight);
  }

  public async getInfo(): Promise<EncodedInfoInterface> {
    return this.api
      .get<EncodedInfoInterface>(V1_API_ROUTES.GET_INFO)
      .then((r) => r.data);
  }

  public async getLatestBlock(): Promise<AxiosResponse<EncodedLatestBlock>> {
    return this.api.get<EncodedLatestBlock>(V1_API_ROUTES.GET_LATEST_BLOCK);
  }

  public async getPrice(
    size: number | bigint,
    ledgerId: bigint | number = 0
  ): Promise<PriceInfo> {
    const encoded = (
      await Utils.checkAndThrow(
        this.api.get<EncodedPriceInfo>(
          V1_API_ROUTES.GET_TX_PRICE.replace(
            "{ledgerId}",
            ledgerId.toString()
          ).replace("{size}", size.toString())
        ),
        "getting price for transaction"
      )
    ).data;
    return {
      permFee: BigInt(encoded.permFee),
      termFee: BigInt(encoded.termFee),
      ledger: Number(encoded.termFee),
      bytes: BigInt(encoded.bytes),
    };
  }
}

// INCOMPLETE
export type EncodedLatestBlock = {
  blockHash: UTF8<BlockHash>;
};

export type EncodedInfoInterface = {
  version: string;
  peerCount: number;
  chainId: number;
  height: number;
  blockHash: Base58<H256>;
  blockIndexHeight: number;
  blocks: number;
};

export type EncodedPriceInfo = {
  permFee: UTF8<U256>;
  termFee: UTF8<U256>;
  ledger: UTF8<U32>;
  bytes: UTF8<U64>;
};

export type PriceInfo = {
  permFee: U256;
  termFee: U256;
  ledger: U32;
  bytes: U64;
};
