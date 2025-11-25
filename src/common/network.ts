import type { AxiosResponse } from "axios";
import type Api from "./api";
import type { ApiRequestConfig, BlockParam } from "./api";
import { BlockTag, V1_API_ROUTES } from "./api";
import type {
  Address,
  Base58,
  BlockHash,
  EpochTimestampMs,
  H256,
  TransactionId,
  U256,
  U32,
  U64,
  U8,
  UTF8,
} from "./dataTypes";
import type { EncodedStorageConfigInterface } from "./storageConfig";
import { Utils } from "./utilities";
import { decodeBase58ToFixed, encodeAddress } from "./utils";
import type {
  CommitmentType,
  EncodedSignedCommitmentTransactionInterface,
} from "./commitmentTransaction";
import { encodeCommitmentType } from "./commitmentTransaction";
import type { FixMe } from "./types";
import { EncodedSignedDataTransactionInterface } from "./dataTransaction";

// TODO: return a "request builder" that allows for more modification?
export class Network {
  public api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  public async getStorageConfig(
    config?: ApiRequestConfig
  ): Promise<EncodedStorageConfigInterface> {
    return (
      await this.api.get<EncodedStorageConfigInterface>(
        V1_API_ROUTES.GET_STORAGE_CONFIG,
        config
      )
    ).data;
  }

  public async getHeight(config?: ApiRequestConfig): Promise<U64> {
    return this.getInfo(config).then((r) => BigInt(r.blockIndexHeight));
  }

  public async getInfo(
    config?: ApiRequestConfig
  ): Promise<EncodedInfoInterface> {
    return this.api
      .get<EncodedInfoInterface>(V1_API_ROUTES.GET_INFO, config)
      .then((r) => r.data);
  }

  public async getLatestBlock(
    withPoa = false,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<EncodedCombinedBlockHeader>> {
    return this.getBlock(BlockTag.LATEST, withPoa, config);
  }

  public async getBlock(
    param: BlockParam,
    withPoa = false,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<EncodedCombinedBlockHeader>> {
    return await Utils.wrapError(
      this.api.get<EncodedCombinedBlockHeader>(
        V1_API_ROUTES.GET_BLOCK.replace("{blockParam}", param.toString()) +
          (withPoa ? "/full" : ""),
        config
      ),
      `getting block by param: ${param.toString()}`
    );
  }

  public async getTransaction(
    id: TransactionId,
    config?: ApiRequestConfig
  ): Promise<
    AxiosResponse<
      | EncodedSignedCommitmentTransactionInterface
      | EncodedSignedDataTransactionInterface
    >
  > {
    return await Utils.wrapError(
      this.api.get<
        | EncodedSignedCommitmentTransactionInterface
        | EncodedSignedDataTransactionInterface
      >(V1_API_ROUTES.GET_TX.replace("{txId}", id.toString()), config),
      `getting tx by ID: ${id.toString()}`
    );
  }

  public async getAnchor(config?: ApiRequestConfig): Promise<AnchorInfo> {
    const encoded = (
      await Utils.wrapError(
        this.api.get<EncodedAnchorInfo>(V1_API_ROUTES.GET_ANCHOR, config),
        "getting latest anchor"
      )
    ).data;
    return {
      blockHash: decodeBase58ToFixed(encoded.blockHash, 32),
    };
  }

  public async getPrice(
    size: number | bigint,
    ledgerId: bigint | number = 0,
    config?: ApiRequestConfig
  ): Promise<PriceInfo> {
    const encoded = (
      await Utils.wrapError(
        this.api.get<EncodedPriceInfo>(
          V1_API_ROUTES.GET_TX_PRICE.replace(
            "{ledgerId}",
            ledgerId.toString()
          ).replace("{size}", size.toString()),
          config
        ),
        "getting price for data transaction"
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
    type: CommitmentType,
    config?: ApiRequestConfig
  ): Promise<PledgePriceInfo | StakePriceInfo> {
    const encoded = (
      await Utils.wrapError(
        this.api.get<EncodedPledgePriceInfo | EncodedStakePriceInfo>(
          V1_API_ROUTES.GET_COMMITMENT_PRICE.replace(
            "{type}",
            encodeCommitmentType(type).type
          ).replace("{userAddress}", encodeAddress(address)),
          config
        ),
        "getting price for commitment transaction"
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

  public async getBlockIndex(
    fromHeight: number | U64,
    pageSize = 100,
    config?: ApiRequestConfig
  ): Promise<EncodedBlockIndexEntry[]> {
    return (
      await Utils.wrapError(
        this.api.get(
          V1_API_ROUTES.GET_BLOCK_INDEX.replace(
            "{height}",
            fromHeight.toString()
          ).replace("{limit}", pageSize.toString()),
          config
        ),
        "Getting block index page"
      )
    ).data;
  }
}

export type EncodedBlockIndexEntry = {
  blockHash: Base58<BlockHash>;
  numLedgers: U8;
  ledgers: EncodedLedgerIndexItem[];
};

export type EncodedLedgerIndexItem = {
  totalChunks: UTF8<U64>;
  txRoot: Base58<H256>;
};

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
export type EncodedCombinedBlockHeader = {
  version: U8;
  blockHash: Base58<BlockHash>;
  height: UTF8<U64>;
  dataLedgers: EncodedDataLedger[];
  systemLedgers: EncodedSystemTransactionLedger[];
  timestamp: UTF8<EpochTimestampMs>;
};

export type EncodedDataLedger = {
  ledgerId: U8;
  txRoot: Base58<H256>;
  txIds: Base58<H256>[];
  totalChunks: UTF8<U64>;
  expires?: UTF8<U64>;
  proofs?: FixMe[]; // TODO
  requiredProofCount?: U8;
};

export type EncodedSystemTransactionLedger = {
  ledgerId: U8;
  txIds: Base58<H256>[];
};

export type EncodedInfoInterface = {
  version: string;
  peerCount: number;
  chainId: UTF8<U64>;
  height: UTF8<U64>;
  blockHash: Base58<H256>;
  blockIndexHeight: UTF8<U64>;
  blockIndexHash: Base58<H256>;
  pendingBlocks: UTF8<U64>;
  isSyncing: boolean;
  currentSyncHeight: UTF8<U64>;
  uptimeSecs: UTF8<U64>;
  miningAddress: Base58<Address>;
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
