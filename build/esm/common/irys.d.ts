import type { ApiConfig } from "./api.js";
import Api from "./api.js";
import type CryptoInterface from "./cryptoInterface.js";
import type { U64 } from "./dataTypes.js";
import Merkle from "./merkle.js";
import { ProgrammableData } from "./programmableData.js";
import { StorageConfig } from "./storageConfig.js";
import type { UnsignedDataTransactionInterface } from "./dataTransaction.js";
import { UnsignedDataTransaction } from "./dataTransaction.js";
import { Utils } from "./utilities.js";
import { Account } from "./account.js";
import { Network } from "./network.js";
import { StorageTransactions } from "./storageTransactions.js";
import type { UnsignedCommitmentTransactionInterface } from "./commitmentTransaction.js";
import { UnsignedCommitmentTransaction } from "./commitmentTransaction.js";
export type IrysConfig = {
    api: ApiConfig;
    chainId: U64;
    cryptoDriver: CryptoInterface;
    storageConfig?: StorageConfig;
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
    network: Network;
    storageTransactions: StorageTransactions;
    constructor(config: IrysConfig);
    ready(): Promise<this>;
    get executionRpcUrl(): URL;
    createDataTransaction(attributes?: Partial<UnsignedDataTransactionInterface>): UnsignedDataTransaction;
    createCommitmentTransaction(attributes?: Partial<UnsignedCommitmentTransactionInterface>): UnsignedCommitmentTransaction;
}
