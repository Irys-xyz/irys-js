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
}
exports.StorageConfig = StorageConfig;
//# sourceMappingURL=storageConfig.js.map