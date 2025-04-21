import { encodeBase58 } from "ethers";
import { b64UrlToBuffer, bigIntDivCeil, bufferTob64Url, decodeBase58ToBuf, jsonBigIntSerialize, toFixedUint8Array, } from "./utils.js";
import { unpackChunk } from "./packing.js";
import { IRYS_TESTNET_CHAIN_ID } from "./constants.js";
export var ChunkFormat;
(function (ChunkFormat) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ChunkFormat["PackedChunk"] = "packed";
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ChunkFormat["UnpackedChunk"] = "unpacked";
})(ChunkFormat || (ChunkFormat = {}));
const unpackedChunkProperties = [
    "dataRoot",
    "dataSize",
    "dataPath",
    "txOffset",
    "bytes",
];
// Computes a chunk's end byte offset
// (this is used for the merkle proof)
export function chunkEndByteOffset(txOffset, dataSize, chunkSize) {
    const bnChunkSize = BigInt(chunkSize);
    const biTxOffset = BigInt(txOffset);
    const lastIndex = bigIntDivCeil(dataSize, bnChunkSize);
    if (biTxOffset === lastIndex - 1n) {
        return dataSize - 1n;
    }
    else {
        return (biTxOffset + 1n) * bnChunkSize - 1n;
    }
}
export class UnpackedChunk {
    dataRoot; // root hash
    dataSize; // total size of the data stored by this data_root in bytes
    dataPath; // raw bytes of the merkle proof that connect the chunk hash to the data root
    txOffset; // 0-based index of the chunk in the transaction
    bytes; // Raw bytes to be stored. should be network constant `chunk_size` unless it's the very last chunk
    constructor(attributes) {
        for (const k of unpackedChunkProperties) {
            this[k] = attributes[k];
        }
    }
    byteOffset(chunkSize) {
        return chunkEndByteOffset(this.txOffset, this.dataSize, chunkSize);
    }
    encode() {
        return {
            dataRoot: encodeBase58(this.dataRoot),
            dataPath: bufferTob64Url(this.dataPath),
            dataSize: this.dataSize,
            txOffset: this.txOffset,
            bytes: bufferTob64Url(this.bytes),
        };
    }
    static decode(data) {
        return new UnpackedChunk({
            dataRoot: toFixedUint8Array(decodeBase58ToBuf(data.dataRoot), 32),
            dataPath: b64UrlToBuffer(data.dataPath),
            dataSize: BigInt(data.dataSize),
            txOffset: data.txOffset,
            bytes: b64UrlToBuffer(data.bytes),
        });
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return jsonBigIntSerialize(this.encode());
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const packedChunkProperties = [
    ...unpackedChunkProperties,
    "packingAddress",
    "partitionOffset",
    "partitionHash",
];
export class PackedChunk {
    dataRoot;
    dataSize;
    dataPath;
    txOffset;
    bytes;
    packingAddress;
    partitionOffset;
    partitionHash;
    irys;
    constructor(irys, attributes) {
        Object.assign(this, attributes);
        this.irys = irys;
    }
    encode() {
        return {
            dataRoot: encodeBase58(this.dataRoot),
            dataPath: bufferTob64Url(this.dataPath),
            dataSize: this.dataSize,
            txOffset: this.txOffset,
            bytes: bufferTob64Url(this.bytes),
            packingAddress: encodeBase58(this.packingAddress),
            partitionOffset: this.partitionOffset,
            partitionHash: encodeBase58(this.partitionHash),
        };
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return jsonBigIntSerialize(this.encode());
    }
    static decode(irys, data) {
        return new PackedChunk(irys, {
            dataRoot: toFixedUint8Array(decodeBase58ToBuf(data.dataRoot), 32),
            dataPath: b64UrlToBuffer(data.dataPath),
            dataSize: BigInt(data.dataSize),
            txOffset: data.txOffset,
            bytes: b64UrlToBuffer(data.bytes),
            packingAddress: toFixedUint8Array(decodeBase58ToBuf(data.packingAddress), 20),
            partitionOffset: data.partitionOffset,
            partitionHash: toFixedUint8Array(decodeBase58ToBuf(data.partitionHash), 32),
        });
    }
    async unpack() {
        return unpackChunk(this, this.irys.storageConfig.chunkSize, this.irys.storageConfig.entropyPackingIterations, IRYS_TESTNET_CHAIN_ID);
    }
}
//# sourceMappingURL=chunk.js.map