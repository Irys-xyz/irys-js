"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackedChunk = exports.packedChunkProperties = exports.UnpackedChunk = exports.chunkEndByteOffset = exports.ChunkFormat = void 0;
const ethers_1 = require("ethers");
const utils_1 = require("./utils");
const packing_1 = require("./packing");
const constants_1 = require("./constants");
var ChunkFormat;
(function (ChunkFormat) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ChunkFormat["PackedChunk"] = "packed";
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ChunkFormat["UnpackedChunk"] = "unpacked";
})(ChunkFormat || (exports.ChunkFormat = ChunkFormat = {}));
const unpackedChunkProperties = [
    "dataRoot",
    "dataSize",
    "dataPath",
    "txOffset",
    "bytes",
];
// Computes a chunk's end byte offset
// (this is used for the merkle proof)
function chunkEndByteOffset(txOffset, dataSize, chunkSize) {
    const bnChunkSize = BigInt(chunkSize);
    const biTxOffset = BigInt(txOffset);
    const lastIndex = (0, utils_1.bigIntDivCeil)(dataSize, bnChunkSize);
    if (biTxOffset === lastIndex - 1n) {
        return dataSize - 1n;
    }
    else {
        return (biTxOffset + 1n) * bnChunkSize - 1n;
    }
}
exports.chunkEndByteOffset = chunkEndByteOffset;
class UnpackedChunk {
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
            dataRoot: (0, ethers_1.encodeBase58)(this.dataRoot),
            dataPath: (0, utils_1.bufferTob64Url)(this.dataPath),
            dataSize: this.dataSize,
            txOffset: this.txOffset,
            bytes: (0, utils_1.bufferTob64Url)(this.bytes),
        };
    }
    static decode(data) {
        return new UnpackedChunk({
            dataRoot: (0, utils_1.toFixedUint8Array)((0, utils_1.decodeBase58)(data.dataRoot), 32),
            dataPath: (0, utils_1.b64UrlToBuffer)(data.dataPath),
            dataSize: BigInt(data.dataSize),
            txOffset: data.txOffset,
            bytes: (0, utils_1.b64UrlToBuffer)(data.bytes),
        });
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return (0, utils_1.jsonBigIntSerialize)(this.encode());
    }
}
exports.UnpackedChunk = UnpackedChunk;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
exports.packedChunkProperties = [
    ...unpackedChunkProperties,
    "packingAddress",
    "partitionOffset",
    "partitionHash",
];
class PackedChunk {
    constructor(irys, attributes) {
        Object.assign(this, attributes);
        this.irys = irys;
    }
    encode() {
        return {
            dataRoot: (0, ethers_1.encodeBase58)(this.dataRoot),
            dataPath: (0, utils_1.bufferTob64Url)(this.dataPath),
            dataSize: this.dataSize,
            txOffset: this.txOffset,
            bytes: (0, utils_1.bufferTob64Url)(this.bytes),
            packingAddress: (0, ethers_1.encodeBase58)(this.packingAddress),
            partitionOffset: this.partitionOffset,
            partitionHash: (0, ethers_1.encodeBase58)(this.partitionHash),
        };
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return (0, utils_1.jsonBigIntSerialize)(this.encode());
    }
    static decode(irys, data) {
        return new PackedChunk(irys, {
            dataRoot: (0, utils_1.toFixedUint8Array)((0, utils_1.decodeBase58)(data.dataRoot), 32),
            dataPath: (0, utils_1.b64UrlToBuffer)(data.dataPath),
            dataSize: BigInt(data.dataSize),
            txOffset: data.txOffset,
            bytes: (0, utils_1.b64UrlToBuffer)(data.bytes),
            packingAddress: (0, utils_1.toFixedUint8Array)((0, utils_1.decodeBase58)(data.packingAddress), 20),
            partitionOffset: data.partitionOffset,
            partitionHash: (0, utils_1.toFixedUint8Array)((0, utils_1.decodeBase58)(data.partitionHash), 32),
        });
    }
    async unpack() {
        return (0, packing_1.unpackChunk)(this, this.irys.storageConfig.chunkSize, this.irys.storageConfig.entropyPackingIterations, constants_1.IRYS_TESTNET_CHAIN_ID);
    }
}
exports.PackedChunk = PackedChunk;
//# sourceMappingURL=chunk.js.map