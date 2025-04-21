"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrysClient = void 0;
const tslib_1 = require("tslib");
const api_1 = tslib_1.__importDefault(require("./api"));
const merkle_1 = tslib_1.__importDefault(require("./merkle"));
const programmableData_1 = require("./programmableData");
const storageConfig_1 = require("./storageConfig");
const transaction_1 = require("./transaction");
const utilities_1 = require("./utilities");
const account_1 = require("./account");
class IrysClient {
    constructor(config) {
        this.config = config;
        this.cryptoDriver = config.cryptoDriver;
    }
    async ready() {
        this.api = new api_1.default(this.config.api);
        // get storage config
        // TODO: validate chainID
        this.storageConfig ??= new storageConfig_1.StorageConfig((await this.api.get("/network/config")).data);
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
    createTransaction(attributes) {
        return new transaction_1.UnsignedTransaction(this, attributes);
    }
}
exports.IrysClient = IrysClient;
//# sourceMappingURL=irys.js.map