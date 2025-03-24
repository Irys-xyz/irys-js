import type { ApiConfig } from "./api.js";
import Api from "./api.js";
import type CryptoInterface from "./cryptoInterface.js";
import type { U64 } from "./dataTypes.js";
import Merkle from "./merkle.js";
import { ProgrammableData } from "./programmableData.js";
import { StorageConfig } from "./storageConfig.js";
import type { UnsignedTransactionInterface } from "./transaction.js";
import { UnsignedTransaction } from "./transaction.js";
import { Utils } from "./utilities.js";
import { Account } from "./account.js";
export type IrysConfig = {
    api: ApiConfig;
    chainId: U64;
    cryptoDriver: CryptoInterface;
};
export declare class IrysClient {
    config: IrysConfig;
    api: Api;
    merkle: Merkle;
    storageConfig: StorageConfig;
    cryptoDriver: CryptoInterface;
    programmableData: ProgrammableData;
    utils: Utils;
    account: Account;
    constructor(config: IrysConfig);
    ready(): Promise<this>;
    get executionRpcUrl(): URL;
    createTransaction(attributes?: Partial<UnsignedTransactionInterface>): UnsignedTransaction;
}
