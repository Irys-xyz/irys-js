import Api from "./api.js";
import Merkle from "./merkle.js";
import { ProgrammableData } from "./programmableData.js";
import { StorageConfig } from "./storageConfig.js";
import { UnsignedTransaction } from "./transaction.js";
import { Utils } from "./utilities.js";
import { Account } from "./account.js";
export class IrysClient {
    config;
    api;
    merkle;
    storageConfig;
    cryptoDriver;
    programmableData;
    utils;
    account;
    constructor(config) {
        this.config = config;
        this.cryptoDriver = config.cryptoDriver;
    }
    async ready() {
        this.api = new Api(this.config.api);
        // get storage config
        // TODO: validate chainID
        this.storageConfig ??= new StorageConfig((await this.api.get("/network/config")).data);
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
    createTransaction(attributes) {
        return new UnsignedTransaction(this, attributes);
    }
}
//# sourceMappingURL=irys.js.map