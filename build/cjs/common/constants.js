"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRYS_TESTNET_CHAIN_ID = exports.SHA_HASH_SIZE = exports.MERKLE_HASH_SIZE = exports.MERKLE_NOTE_SIZE = exports.MIN_CHUNK_SIZE = exports.MAX_CHUNK_SIZE = exports.ENTROPY_PACKING_INTERATIONS = exports.NUM_PARTITIONS_PER_SLOT = exports.NUM_CHUNKS_IN_RECALL_RANGE = exports.NUM_CHUNKS_IN_PARTITION = exports.CHUNK_SIZE = void 0;
// defaults
exports.CHUNK_SIZE = 256 * 1024;
exports.NUM_CHUNKS_IN_PARTITION = 10;
exports.NUM_CHUNKS_IN_RECALL_RANGE = 2;
exports.NUM_PARTITIONS_PER_SLOT = 1;
exports.ENTROPY_PACKING_INTERATIONS = 2_000;
// merkle constants
exports.MAX_CHUNK_SIZE = 256 * 1024;
exports.MIN_CHUNK_SIZE = 32 * 1024;
exports.MERKLE_NOTE_SIZE = 32;
exports.MERKLE_HASH_SIZE = 32;
exports.SHA_HASH_SIZE = 32;
exports.IRYS_TESTNET_CHAIN_ID = 1270n;
//# sourceMappingURL=constants.js.map