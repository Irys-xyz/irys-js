import type { ApiConfig } from "./api";
import Api from "./api";
import type CryptoInterface from "./cryptoInterface";
import type { U64 } from "./dataTypes";
import Merkle from "./merkle";
import { ProgrammableData } from "./programmableData";
import { StorageConfig } from "./storageConfig";
import type { UnsignedDataTransactionInterface } from "./dataTransaction";
import { UnsignedDataTransaction } from "./dataTransaction";
import { Utils } from "./utilities";
import { Account } from "./account";
import { Network } from "./network";
import { StorageTransactions } from "./storageTransactions";
import type { UnsignedCommitmentTransactionInterface } from "./commitmentTransaction";
import { UnsignedCommitmentTransaction } from "./commitmentTransaction";

export type IrysConfig = {
  api: ApiConfig;
  chainId: U64;
  cryptoDriver: CryptoInterface;
  storageConfig?: StorageConfig;
};

// // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unsafe-declaration-merging
// export declare interface IrysClient {
//   on<U extends keyof IrysClientEvents>(
//     event: U,
//     listener: IrysClientEvents[U]
//   ): this;

//   emit<U extends keyof IrysClientEvents>(
//     event: U,
//     ...args: Parameters<IrysClientEvents[U]>
//   ): boolean;
// }

// type IrysClientEvents = {
//   chunkUpload: ({
//     txId,
//     offset,
//     index,
//   }: {
//     txId: TransactionId;
//     offset: bigint;
//     index: number;
//   }) => void;
//   debugLog: (msg: string, meta?: any) => void;
//   infoLog: (msg: string, meta?: any) => void;
//   warnLog: (msg: string, meta?: any) => void;
//   errorLog: (msg: string, meta?: any) => void;
// };

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class IrysClient /* extends EventEmitter */ {
  public config: IrysConfig;
  public api!: Api;
  public merkle!: Merkle;
  public storageConfig!: StorageConfig;
  public cryptoDriver: CryptoInterface;
  public programmableData!: ProgrammableData;
  public utils!: Utils;
  public account!: Account;
  public network!: Network;
  public storageTransactions!: StorageTransactions;

  constructor(config: IrysConfig) {
    // super({ captureRejections: true });
    this.config = config;
    this.cryptoDriver = config.cryptoDriver;
    if (config.storageConfig) this.storageConfig = config.storageConfig;
  }

  public async ready(): Promise<this> {
    this.api = new Api(this.config.api);
    this.network = new Network(this.api);
    this.storageTransactions = new StorageTransactions(this.api);
    // get storage config
    // TODO: validate chainID, remove/rework this
    this.storageConfig ??= StorageConfig.decode(
      await this.network.getStorageConfig()
    );
    this.utils = new Utils(this);
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

  public get executionRpcUrl(): URL {
    return this.api.executionRpcUrl;
  }

  public createDataTransaction(
    attributes?: Partial<UnsignedDataTransactionInterface>
  ): UnsignedDataTransaction {
    return new UnsignedDataTransaction(this, attributes);
  }

  public createCommitmentTransaction(
    attributes?: Partial<UnsignedCommitmentTransactionInterface>
  ): UnsignedCommitmentTransaction {
    return new UnsignedCommitmentTransaction(this, attributes);
  }
}
