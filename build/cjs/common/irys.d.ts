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
import { Network } from "./network";
import { StorageTransactions } from "./storageTransactions";
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
    createTransaction(attributes?: Partial<UnsignedTransactionInterface>): UnsignedTransaction;
}
