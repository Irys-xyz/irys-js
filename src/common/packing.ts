import type { PackedChunk } from "./chunk";
import { UnpackedChunk } from "./chunk";
import { SHA_HASH_SIZE } from "./constants";
import type CryptoInterface from "./cryptoInterface";
import type { Address, FixedUint8Array, H256, U64 } from "./dataTypes";
import {
  bigIntDivCeil,
  bigIntToBytes,
  concatBuffers,
  safeBigIntToNumber,
} from "./utils";

export async function computeEntropyChunk(
  crypto: CryptoInterface,
  packingAddress: Address,
  partitionOffset: bigint,
  partitionHash: FixedUint8Array<32>,
  entropyPackingIterations: number,
  chunkSize: number,
  chainId: U64,
): Promise<Uint8Array> {
  let previousSegment = await computeSeedHash(
    crypto,
    packingAddress,
    partitionOffset,
    partitionHash,
    chainId,
  );
  const outputEntropy = new Uint8Array(chunkSize);
  let outputCursor = 0;
  let hashCount = chunkSize / SHA_HASH_SIZE;
  for (let i = 0; i < hashCount; i++) {
    previousSegment = await crypto.hash(previousSegment);
    for (let j = 0; j < SHA_HASH_SIZE; j++) {
      outputEntropy[outputCursor++] = previousSegment[j];
    }
  }
  // 2D hash packing
  while (hashCount < entropyPackingIterations) {
    const i = (hashCount % (chunkSize / SHA_HASH_SIZE)) * SHA_HASH_SIZE;
    const prefix =
      i === 0
        ? outputEntropy.subarray(chunkSize - SHA_HASH_SIZE)
        : outputEntropy.subarray(i - SHA_HASH_SIZE, i);
    const suffix = outputEntropy.subarray(i, i + SHA_HASH_SIZE);
    const hash = await crypto.hash(concatBuffers([prefix, suffix]));
    outputEntropy.set(hash, i);
    hashCount++;
  }

  return outputEntropy;
}

export async function computeSeedHash(
  crypto: CryptoInterface,
  address: Address,
  offset: U64,
  partitionHash: H256,
  chainId: U64,
): Promise<Uint8Array> {
  return crypto.hash(
    concatBuffers([
      address,
      partitionHash,
      bigIntToBytes(chainId, 8),
      bigIntToBytes(offset, 8),
    ]),
  );
}

export async function unpackChunk(
  crypto: CryptoInterface,
  chunk: PackedChunk,
  chunkSize: number,
  entropyPackingIterations: number,
  chainId: bigint,
): Promise<UnpackedChunk> {
  const entropy = await computeEntropyChunk(
    crypto,
    chunk.packingAddress,
    BigInt(chunk.partitionOffset),
    chunk.partitionHash,
    entropyPackingIterations,
    chunkSize,
    chainId,
  );
  // xor and slice
  let data = packingXor(entropy, chunk.bytes, chunkSize);

  const bnChunkSize = BigInt(chunkSize);
  const numChunksInTx = safeBigIntToNumber(
    bigIntDivCeil(chunk.dataSize, bnChunkSize),
    "numChunksInTx",
  );

  if (chunk.txOffset === numChunksInTx - 1) {
    const tail = chunk.dataSize % bnChunkSize;
    data = data.subarray(0, safeBigIntToNumber(tail, "tail chunk size"));
  }

  return new UnpackedChunk({
    dataRoot: chunk.dataRoot,
    dataSize: chunk.dataSize,
    dataPath: chunk.dataPath,
    txOffset: chunk.txOffset,
    bytes: data,
  });
}

// consumes/overwrites `entropy`
function packingXor(
  entropy: Uint8Array,
  data: Uint8Array,
  chunkSize: number,
): Uint8Array {
  if (entropy.byteLength !== +chunkSize)
    throw new Error("Entropy needs to be exactly chunkSize bytes");
  if (data.byteLength > entropy.byteLength)
    throw new Error("Data cannot be longer than entropy");

  for (let i = 0; i < data.byteLength; i++) {
    entropy[i] = entropy[i] ^ data[i];
  }
  return entropy;
}
