import type { U16, U18, U200, U32, U34, U8 } from "./dataTypes.js";
declare enum PdAccessListArgsTypeId {
    ChunkRead = 0,
    ByteRead = 1
}
export declare abstract class PdAccessListArgBase {
    abstract get type(): PdAccessListArgsTypeId;
    abstract encode(): Uint8Array;
    static decode(buffer: Uint8Array): PdAccessListArgBase;
}
export declare class ChunkRangeSpecifier extends PdAccessListArgBase {
    partitionIndex: U200;
    offset: U32;
    chunkCount: U16;
    constructor(partitionIndex: U200, offset: U32, chunkCount: U16);
    get type(): PdAccessListArgsTypeId;
    encode(): Uint8Array;
    static decode(buffer: Uint8Array): ChunkRangeSpecifier;
}
export declare class ByteRangeSpecifier extends PdAccessListArgBase {
    index: U8;
    chunkOffset: U16;
    byteOffset: U18;
    length: U34;
    constructor(index: U8, chunkOffset: U16, byteOffset: U18, length: U34);
    get type(): PdAccessListArgsTypeId;
    encode(): Uint8Array;
    static decode(buffer: Uint8Array): ByteRangeSpecifier;
    translateOffset(chunkSize: number, offset: number): ByteRangeSpecifier;
}
export {};
