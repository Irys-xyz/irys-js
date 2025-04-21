import type { Address, FixedUint8Array, H256, U64 } from "./dataTypes.js";
import type { PackedChunk } from "./chunk.js";
import { UnpackedChunk } from "./chunk.js";
export declare function computeEntropyChunk(packingAddress: Address, partitionOffset: bigint, partitionHash: FixedUint8Array<32>, entropyPackingIterations: number, chunkSize: number, chainId: U64): Promise<Uint8Array>;
export declare function computeSeedHash(address: Address, offset: U64, partitionHash: H256, chainId: U64): Promise<Uint8Array>;
export declare function unpackChunk(chunk: PackedChunk, chunkSize: number, entropyPackingIterations: number, chainId: bigint): Promise<UnpackedChunk>;
export declare function computeEntropyChunkWebCrypto(packingAddress: Address, partitionOffset: bigint, partitionHash: FixedUint8Array<32>, entropyPackingIterations: number, chunkSize: number, chainId: U64): Promise<Uint8Array>;
export declare function computeSeedHashWebCrypto(address: Address, offset: U64, partitionHash: H256, chainId: U64): Promise<Uint8Array>;
