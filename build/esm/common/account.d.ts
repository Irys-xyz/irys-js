import type { IrysClient } from "./irys.js";
import type { Base58, U64 } from "./dataTypes.js";
export declare class Account {
    irys: IrysClient;
    constructor(irys: IrysClient);
    getBalance(address: string): Promise<U64>;
    getAddresses(key: string): {
        irys: Base58;
        exec: string;
    };
}
