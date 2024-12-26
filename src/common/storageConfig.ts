import {
  CHUNK_SIZE,
  ENTROPY_PACKING_INTERATIONS,
  NUM_CHUNKS_IN_PARTITION,
  NUM_CHUNKS_IN_RECALL_RANGE,
  NUM_PARTITIONS_PER_SLOT,
} from "./constants";

// fragment of the Node's StorageConfig
// only concensus relevant parameters
export type StorageConfigInterface = {
  // Size of each chunk in bytes
  chunkSize: number;
  // Number of chunks in a partition
  numChunksInPartition: number;
  // Number of chunks in a recall range
  numChunksInRecallRange: number;
  // Number of partition replicas in a ledger slot
  num_partitions_in_slot: number;
  // Number of sha256 iterations required to pack a chunk
  entropy_packing_iterations: number;
};

export class StorageConfig implements StorageConfigInterface {
  public chunkSize: number = CHUNK_SIZE;
  public numChunksInPartition: number = NUM_CHUNKS_IN_PARTITION;
  public numChunksInRecallRange: number = NUM_CHUNKS_IN_RECALL_RANGE;
  public num_partitions_in_slot: number = NUM_PARTITIONS_PER_SLOT;
  public entropy_packing_iterations: number = ENTROPY_PACKING_INTERATIONS;
  constructor(config?: Partial<StorageConfigInterface>) {
    if (config) Object.assign(this, config);
  }
}
