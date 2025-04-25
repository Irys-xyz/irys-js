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

const storageConfigProps = [
  "chunkSize",
  "numChunksInPartition",
  "numChunksInRecallRange",
  "numPartitionsInSlot",
  "entropyPackingIterations",
];

export class StorageConfig implements StorageConfigInterface {
  public chunkSize: number = CHUNK_SIZE;
  public numChunksInPartition: number = NUM_CHUNKS_IN_PARTITION;
  public numChunksInRecallRange: number = NUM_CHUNKS_IN_RECALL_RANGE;
  public numPartitionsInSlot: number = NUM_PARTITIONS_PER_SLOT;
  public entropyPackingIterations: number = ENTROPY_PACKING_INTERATIONS;

  constructor(config?: Partial<StorageConfigInterface>) {
    if (config) {
      for (const k of storageConfigProps) {
        const v = config[k as keyof StorageConfigInterface];
        if (v !== undefined) this[k as keyof this] = v as any;
      }
    }
  }

  public static decode(encoded: EncodedStorageConfigInterface): StorageConfig {
    return new StorageConfig({
      chunkSize: Number(encoded.chunkSize),
      numChunksInPartition: Number(encoded.numChunksInPartition),
      numChunksInRecallRange: Number(encoded.numChunksInRecallRange),
      numPartitionsInSlot: Number(encoded.numPartitionsInSlot),
      entropyPackingIterations: Number(encoded.entropyPackingIterations),
    });
  }

  // // creates a StorageConfig from a snake_case JSON object (i.e from the API)
  // static fromSnakeConfig(config: Record<string, string>): StorageConfig {
  //   const props = storageConfigProps.reduce<Record<string, string>>(
  //     (props, k) => {
  //       const v = config[camelToSnake(k)];
  //       if (v !== undefined) props[k] = v as any;
  //       return props;
  //     },
  //     {}
  //   );
  //   return new StorageConfig(props as Partial<StorageConfigInterface>);
  // }
}
