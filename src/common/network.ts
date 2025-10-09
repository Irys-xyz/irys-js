import type { AxiosResponse } from "axios";
import type Api from "./api";
import { V1_API_ROUTES } from "./api";
import type {
  Address,
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
import { decodeBase58ToFixed, encodeAddress } from "./utils";
import type { CommitmentType } from "./commitmentTransaction";
import { encodeCommitmentType } from "./commitmentTransaction";

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

  public async getAnchor(): Promise<AnchorInfo> {
    const encoded = (
      await Utils.checkAndThrow(
        this.api.get<EncodedAnchorInfo>(V1_API_ROUTES.GET_ANCHOR),
        "getting latest anchor"
      )
    ).data;
    return {
      blockHash: decodeBase58ToFixed(encoded.blockHash, 32),
    };
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

  public async getCommitmentPrice(
    address: Address,
    type: CommitmentType
  ): Promise<PledgePriceInfo | StakePriceInfo> {
    const encoded = (
      await Utils.checkAndThrow(
        this.api.get<EncodedPledgePriceInfo | EncodedStakePriceInfo>(
          V1_API_ROUTES.GET_COMMITMENT_PRICE.replace(
            "{type}",
            encodeCommitmentType(type).type
          ).replace("{userAddress}", encodeAddress(address))
        ),
        "getting price for transaction"
      )
    ).data;
    return {
      value: BigInt(encoded.value),
      fee: BigInt(encoded.fee),
      userAddress: address,
      pledgeCount:
        // TODO: fix
        (encoded as EncodedPledgePriceInfo)?.pledgeCount !== undefined
          ? BigInt((encoded as EncodedPledgePriceInfo).pledgeCount)
          : undefined,
    };
  }
}

export type EncodedAnchorInfo = {
  blockHash: Base58<BlockHash>;
};

export type AnchorInfo = {
  blockHash: BlockHash;
};

export type StakePriceInfo = {
  value: U256;
  fee: U256;
};

export type PledgePriceInfo = StakePriceInfo & {
  userAddress: Address;
  pledgeCount: U64;
};

export type EncodedStakePriceInfo = {
  value: UTF8<U256>;
  fee: UTF8<U256>;
};

export type EncodedPledgePriceInfo = EncodedStakePriceInfo & {
  userAddress: Base58<Address>;
  pledgeCount: UTF8<U64>;
};

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
