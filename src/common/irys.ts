import { Account } from "./account";
import type { ApiConfig } from "./api";
import Api from "./api";
import type { UnsignedCommitmentTransactionInterface } from "./commitmentTransaction";
import { UnsignedCommitmentTransaction } from "./commitmentTransaction";
import type CryptoInterface from "./cryptoInterface";
import type { UnsignedDataTransactionInterface } from "./dataTransaction";
import { UnsignedDataTransaction } from "./dataTransaction";
import type { U64 } from "./dataTypes";
import Merkle from "./merkle";
import { Network } from "./network";
import { ProgrammableData } from "./programmableData";
import { StorageConfig } from "./storageConfig";
import { StorageTransactions } from "./storageTransactions";

export type IrysConfig = {
  api: ApiConfig;
  chainId: U64;
  cryptoDriver: CryptoInterface;
  storageConfig?: StorageConfig;
};

export class IrysClient {
  public config: IrysConfig;
  public api!: Api;
  public merkle!: Merkle;
  public storageConfig!: StorageConfig;
  public cryptoDriver: CryptoInterface;
  public programmableData!: ProgrammableData;
  public account!: Account;
  public network!: Network;
  public storageTransactions!: StorageTransactions;

  constructor(config: IrysConfig) {
    this.config = config;
    this.cryptoDriver = config.cryptoDriver;
    if (config.storageConfig) this.storageConfig = config.storageConfig;
  }

  public async ready(): Promise<this> {
    this.api = new Api(this.config.api);
    this.network = new Network(this.api);
    this.storageTransactions = new StorageTransactions(this.api);
    // TODO: validate chainID, remove/rework this
    this.storageConfig ??= StorageConfig.decode(
      await this.network.getConsensusConfig(),
    );
    this.account = new Account(this);

    this.merkle = new Merkle({
      deps: {
        crypto: this.cryptoDriver,
        storageConfig: this.storageConfig,
      },
    });

    this.programmableData = new ProgrammableData(this);

    return this;
  }

  public get chainId(): U64 {
    return this.config.chainId;
  }

  public get executionRpcUrl(): URL {
    return this.api.executionRpcUrl;
  }

  public createDataTransaction(
    attributes?: Partial<UnsignedDataTransactionInterface>,
  ): UnsignedDataTransaction {
    return new UnsignedDataTransaction(this, attributes);
  }

  public createCommitmentTransaction(
    attributes?: Partial<UnsignedCommitmentTransactionInterface>,
  ): UnsignedCommitmentTransaction {
    return new UnsignedCommitmentTransaction(this, attributes);
  }
}
