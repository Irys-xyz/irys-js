import Api from "./api.js";
import Merkle from "./merkle.js";
import { ProgrammableData } from "./programmableData.js";
import { StorageConfig } from "./storageConfig.js";
import { UnsignedDataTransaction } from "./dataTransaction.js";
import { Utils } from "./utilities.js";
import { Account } from "./account.js";
import { Network } from "./network.js";
import { StorageTransactions } from "./storageTransactions.js";
import { UnsignedCommitmentTransaction } from "./commitmentTransaction.js";
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
    config;
    api;
    merkle;
    storageConfig;
    cryptoDriver;
    programmableData;
    utils;
    account;
    network;
    storageTransactions;
    constructor(config) {
        // super({ captureRejections: true });
        this.config = config;
        this.cryptoDriver = config.cryptoDriver;
        if (config.storageConfig)
            this.storageConfig = config.storageConfig;
    }
    async ready() {
        this.api = new Api(this.config.api);
        this.network = new Network(this.api);
        this.storageTransactions = new StorageTransactions(this.api);
        // get storage config
        // TODO: validate chainID, remove/rework this
        this.storageConfig ??= StorageConfig.decode(await this.network.getStorageConfig());
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
    get executionRpcUrl() {
        return this.api.executionRpcUrl;
    }
    createDataTransaction(attributes) {
        return new UnsignedDataTransaction(this, attributes);
    }
    createCommitmentTransaction(attributes) {
        return new UnsignedCommitmentTransaction(this, attributes);
    }
}
//# sourceMappingURL=irys.js.map