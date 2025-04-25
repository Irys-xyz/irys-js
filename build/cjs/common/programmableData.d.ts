import type { Base58, U8 } from "./dataTypes";
import { ByteRangeSpecifier, ChunkRangeSpecifier } from "./rangeSpecifier";
import type { IrysClient } from "./irys";
export declare const PD_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000500";
export declare class ReadBuilder {
    protected readRanges: {
        txId: string;
        start: U8;
        length: U8;
    }[];
    irys: IrysClient;
    constructor(irys: IrysClient);
    read(txId: Base58, offset: U8, length: U8): this;
    toAccessList(): Promise<{
        address: string;
        storageKeys: string[];
    }>;
    build(): Promise<{
        chunkRanges: ChunkRangeSpecifier[];
        byteRanges: ByteRangeSpecifier[];
    }>;
}
export declare class ProgrammableData {
    irys: IrysClient;
    constructor(irys: IrysClient);
    read(txId: Base58, offset: U8, length: U8): ReadBuilder;
}
