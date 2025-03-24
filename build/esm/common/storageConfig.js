import { CHUNK_SIZE, ENTROPY_PACKING_INTERATIONS, NUM_CHUNKS_IN_PARTITION, NUM_CHUNKS_IN_RECALL_RANGE, NUM_PARTITIONS_PER_SLOT, } from "./constants.js";
const storageConfigProps = [
    "chunkSize",
    "numChunksInPartition",
    "numChunksInRecallRange",
    "numPartitionsInSlot",
    "entropyPackingIterations",
];
export class StorageConfig {
    chunkSize = CHUNK_SIZE;
    numChunksInPartition = NUM_CHUNKS_IN_PARTITION;
    numChunksInRecallRange = NUM_CHUNKS_IN_RECALL_RANGE;
    numPartitionsInSlot = NUM_PARTITIONS_PER_SLOT;
    entropyPackingIterations = ENTROPY_PACKING_INTERATIONS;
    constructor(config) {
        if (config) {
            for (const k of storageConfigProps) {
                const v = config[k];
                if (v !== undefined)
                    this[k] = v;
            }
        }
    }
}
//# sourceMappingURL=storageConfig.js.map