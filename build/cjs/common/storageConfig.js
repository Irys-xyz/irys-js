"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageConfig = void 0;
const constants_1 = require("./constants");
const storageConfigProps = [
    "chunkSize",
    "numChunksInPartition",
    "numChunksInRecallRange",
    "numPartitionsInSlot",
    "entropyPackingIterations",
];
class StorageConfig {
    constructor(config) {
        this.chunkSize = constants_1.CHUNK_SIZE;
        this.numChunksInPartition = constants_1.NUM_CHUNKS_IN_PARTITION;
        this.numChunksInRecallRange = constants_1.NUM_CHUNKS_IN_RECALL_RANGE;
        this.numPartitionsInSlot = constants_1.NUM_PARTITIONS_PER_SLOT;
        this.entropyPackingIterations = constants_1.ENTROPY_PACKING_INTERATIONS;
        if (config) {
            for (const k of storageConfigProps) {
                const v = config[k];
                if (v !== undefined)
                    this[k] = v;
            }
        }
    }
    static decode(encoded) {
        return new StorageConfig({
            chunkSize: Number(encoded.chunkSize),
            numChunksInPartition: Number(encoded.numChunksInPartition),
            numChunksInRecallRange: Number(encoded.numChunksInRecallRange),
            numPartitionsInSlot: Number(encoded.numPartitionsInSlot),
            entropyPackingIterations: Number(encoded.entropyPackingIterations),
        });
    }
}
exports.StorageConfig = StorageConfig;
//# sourceMappingURL=storageConfig.js.map