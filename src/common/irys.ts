import type { ApiConfig } from "./api";
import Api from "./api";
import type CryptoInterface from "./cryptoInterface";
import type { U64 } from "./dataTypes";
import Merkle from "./merkle";
import { ProgrammableData } from "./programmableData";
import { StorageConfig } from "./storageConfig";
import type { UnsignedTransactionInterface } from "./transaction";
import { UnsignedTransaction } from "./transaction";
import { Utils } from "./utilities";
import { Account } from "./account";

export type IrysConfig = {
  api: ApiConfig;
  chainId: U64;
  cryptoDriver: CryptoInterface;
};

export class IrysClient {
  public config: IrysConfig;
  public api!: Api;
  public merkle!: Merkle;
  public storageConfig!: StorageConfig;
  public cryptoDriver: CryptoInterface;
  public programmableData!: ProgrammableData;
  public utils!: Utils;
  public account!: Account;

  constructor(config: IrysConfig) {
    this.config = config;
    this.cryptoDriver = config.cryptoDriver;
  }

  public async ready(): Promise<this> {
    this.api = new Api(this.config.api);
    // get storage config
    // TODO: validate chainID
    this.storageConfig = new StorageConfig(
      (await this.api.get("/network/config")).data
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

  public createTransaction(
    attributes?: Partial<UnsignedTransactionInterface>
  ): UnsignedTransaction {
    return new UnsignedTransaction(this, attributes);
  }
}
