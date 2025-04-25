import type { Address, Base58, Base64Url, H256, PartitionChunkOffset, TxRelativeChunkOffset, U64 } from "./dataTypes";
import type { IrysClient } from "./irys";
export declare enum ChunkFormat {
    PackedChunk = "packed",
    UnpackedChunk = "unpacked"
}
export type UnpackedChunkInterface = {
    dataRoot: H256;
    dataSize: U64;
    dataPath: Uint8Array;
    txOffset: TxRelativeChunkOffset;
    bytes: Uint8Array;
};
export type EncodedUnpackedChunkInterface = {
    dataRoot: Base58;
    dataSize: U64;
    dataPath: Base64Url;
    txOffset: TxRelativeChunkOffset;
    bytes: Base64Url;
};
export declare function chunkEndByteOffset(txOffset: number, dataSize: U64, chunkSize: number): U64;
export declare class UnpackedChunk implements UnpackedChunkInterface {
    dataRoot: H256;
    dataSize: U64;
    dataPath: Uint8Array;
    txOffset: TxRelativeChunkOffset;
    bytes: Uint8Array;
    constructor(attributes: UnpackedChunkInterface);
    byteOffset(chunkSize: number): U64;
    encode(): EncodedUnpackedChunkInterface;
    static decode(data: EncodedUnpackedChunkInterface): UnpackedChunk;
    toJSON(): string;
}
export type PackedChunkInterface = UnpackedChunkInterface & {
    packingAddress: Address;
    partitionOffset: PartitionChunkOffset;
    partitionHash: H256;
};
export type EncodedPackedChunkInterface = EncodedUnpackedChunkInterface & {
    packingAddress: Base58;
    partitionOffset: PartitionChunkOffset;
    partitionHash: Base58;
};
export declare const packedChunkProperties: string[];
export declare class PackedChunk implements PackedChunkInterface {
    dataRoot: H256;
    dataSize: bigint;
    dataPath: Uint8Array;
    txOffset: number;
    bytes: Uint8Array;
    packingAddress: Address;
    partitionOffset: number;
    partitionHash: H256;
    irys: IrysClient;
    constructor(irys: IrysClient, attributes: Partial<PackedChunkInterface>);
    encode(): EncodedPackedChunkInterface;
    toJSON(): string;
    static decode(irys: IrysClient, data: EncodedPackedChunkInterface): PackedChunk;
    unpack(): Promise<UnpackedChunk>;
}
