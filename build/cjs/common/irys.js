"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrysClient = void 0;
const tslib_1 = require("tslib");
const api_1 = tslib_1.__importDefault(require("./api"));
const merkle_1 = tslib_1.__importDefault(require("./merkle"));
const programmableData_1 = require("./programmableData");
const storageConfig_1 = require("./storageConfig");
const dataTransaction_1 = require("./dataTransaction");
const utilities_1 = require("./utilities");
const account_1 = require("./account");
const network_1 = require("./network");
const storageTransactions_1 = require("./storageTransactions");
const commitmentTransaction_1 = require("./commitmentTransaction");
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
class IrysClient /* extends EventEmitter */ {
    constructor(config) {
        // super({ captureRejections: true });
        this.config = config;
        this.cryptoDriver = config.cryptoDriver;
        if (config.storageConfig)
            this.storageConfig = config.storageConfig;
    }
    async ready() {
        this.api = new api_1.default(this.config.api);
        this.network = new network_1.Network(this.api);
        this.storageTransactions = new storageTransactions_1.StorageTransactions(this.api);
        // get storage config
        // TODO: validate chainID, remove/rework this
        this.storageConfig ??= storageConfig_1.StorageConfig.decode(await this.network.getStorageConfig());
        this.utils = new utilities_1.Utils(this);
        this.account = new account_1.Account(this);
        this.merkle = new merkle_1.default({
            deps: {
                crypto: this.cryptoDriver,
                storageConfig: this.storageConfig,
            },
        });
        this.programmableData = new programmableData_1.ProgrammableData(this);
        return this;
    }
    get executionRpcUrl() {
        return this.api.executionRpcUrl;
    }
    createDataTransaction(attributes) {
        return new dataTransaction_1.UnsignedDataTransaction(this, attributes);
    }
    createCommitmentTransaction(attributes) {
        return new commitmentTransaction_1.UnsignedCommitmentTransaction(this, attributes);
    }
}
exports.IrysClient = IrysClient;
//# sourceMappingURL=irys.js.map