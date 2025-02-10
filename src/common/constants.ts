import type { U64 } from "./dataTypes";

// defaults
export const CHUNK_SIZE = 256 * 1024;
export const NUM_CHUNKS_IN_PARTITION = 10;
export const NUM_CHUNKS_IN_RECALL_RANGE = 2;
export const NUM_PARTITIONS_PER_SLOT = 1;
export const ENTROPY_PACKING_INTERATIONS = 2_000;

// merkle constants
export const MAX_CHUNK_SIZE = 256 * 1024;
export const MIN_CHUNK_SIZE = 32 * 1024;
export const MERKLE_NOTE_SIZE = 32;
export const MERKLE_HASH_SIZE = 32;

export const IRYS_TESTNET_CHAIN_ID: U64 = 1270n;
