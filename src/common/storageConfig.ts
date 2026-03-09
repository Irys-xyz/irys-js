import {
  CHUNK_SIZE,
  ENTROPY_PACKING_ITERATIONS,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
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
  numPartitionsInSlot: number;
  // Number of sha256 iterations required to pack a chunk
  entropyPackingIterations: number;
};

export type EncodedStorageConfigInterface = {
  // Size of each chunk in bytes
  chunkSize: string;
  // Number of chunks in a partition
  numChunksInPartition: string;
  // Number of chunks in a recall range
  numChunksInRecallRange: string;
  // Number of partition replicas in a ledger slot
  numPartitionsInSlot: string;
  // Number of sha256 iterations required to pack a chunk
  entropyPackingIterations: string;
};

export class StorageConfig implements StorageConfigInterface {
  public chunkSize: number = CHUNK_SIZE;
  public numChunksInPartition: number = NUM_CHUNKS_IN_PARTITION;
  public numChunksInRecallRange: number = NUM_CHUNKS_IN_RECALL_RANGE;
  public numPartitionsInSlot: number = NUM_PARTITIONS_PER_SLOT;
  public entropyPackingIterations: number = ENTROPY_PACKING_ITERATIONS;

  constructor(config?: Partial<StorageConfigInterface>) {
    if (config) {
      if (config.chunkSize !== undefined) this.chunkSize = config.chunkSize;
      if (config.numChunksInPartition !== undefined)
        this.numChunksInPartition = config.numChunksInPartition;
      if (config.numChunksInRecallRange !== undefined)
        this.numChunksInRecallRange = config.numChunksInRecallRange;
      if (config.numPartitionsInSlot !== undefined)
        this.numPartitionsInSlot = config.numPartitionsInSlot;
      if (config.entropyPackingIterations !== undefined)
        this.entropyPackingIterations = config.entropyPackingIterations;
    }
  }

  public static decode(encoded: EncodedStorageConfigInterface): StorageConfig {
    const config = {
      chunkSize: Number(encoded.chunkSize),
      numChunksInPartition: Number(encoded.numChunksInPartition),
      numChunksInRecallRange: Number(encoded.numChunksInRecallRange),
      numPartitionsInSlot: Number(encoded.numPartitionsInSlot),
      entropyPackingIterations: Number(encoded.entropyPackingIterations),
    };

    const MAX_ENTROPY_ITERATIONS = 100_000_000;
    const MAX_PARTITION_CHUNKS = 1_000_000;

    const validations: [string, number, number, number][] = [
      ["chunkSize", config.chunkSize, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE],
      [
        "numChunksInPartition",
        config.numChunksInPartition,
        1,
        MAX_PARTITION_CHUNKS,
      ],
      [
        "numChunksInRecallRange",
        config.numChunksInRecallRange,
        1,
        MAX_PARTITION_CHUNKS,
      ],
      [
        "numPartitionsInSlot",
        config.numPartitionsInSlot,
        1,
        MAX_PARTITION_CHUNKS,
      ],
      [
        "entropyPackingIterations",
        config.entropyPackingIterations,
        1,
        MAX_ENTROPY_ITERATIONS,
      ],
    ];

    for (const [name, value, min, max] of validations) {
      if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(
          `Invalid StorageConfig: ${name} must be an integer between ${min} and ${max}, got ${value}`,
        );
      }
    }

    return new StorageConfig(config);
  }
}
