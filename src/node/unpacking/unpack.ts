import { createHash, webcrypto } from "crypto";
import type {
  Address,
  FixedUint8Array,
  H256,
  U64,
} from "../../common/dataTypes";
import {
  bigIntDivCeil,
  bigIntToBytes,
  concatBuffers,
} from "../../common/utils";
import { SHA_HASH_SIZE } from "../../common/constants";
import { PackedChunk } from "../../common/chunk";
import { UnpackedChunk } from "../../common/chunk";

export async function computeEntropyChunk(
  packingAddress: Address,
  partitionOffset: bigint,
  partitionHash: FixedUint8Array<32>,
  entropyPackingIterations: number,
  chunkSize: number,
  chainId: U64
): Promise<Uint8Array> {
  let previousSegment = await computeSeedHash(
    packingAddress,
    partitionOffset,
    partitionHash, //  toFixedUnint8Array(decodeBase58ToBuf(chunk.partitionHash), 32)
    chainId
  );
  //   console.log("PSEG", previousSegment);
  const outputEntropy = new Uint8Array(chunkSize);
  let outputCursor = 0;
  let hashCount = chunkSize / SHA_HASH_SIZE;
  for (let i = 0; i < hashCount; i++) {
    previousSegment = createHash("sha256").update(previousSegment).digest();
    for (let j = 0; j < SHA_HASH_SIZE; j++) {
      outputEntropy[outputCursor++] = previousSegment[j];
    }
  }
  // 2D hash packing
  while (hashCount < entropyPackingIterations) {
    const i = (hashCount % (chunkSize / SHA_HASH_SIZE)) * SHA_HASH_SIZE;
    const hasher = createHash("sha256");
    if (i === 0) {
      hasher.update(outputEntropy.subarray(chunkSize - SHA_HASH_SIZE));
    } else {
      hasher.update(outputEntropy.subarray(i - SHA_HASH_SIZE, i));
    }
    hasher.update(outputEntropy.subarray(i, i + SHA_HASH_SIZE));
    const hash = hasher.digest();
    outputEntropy.set(hash, i);
    hashCount++;
  }

  return outputEntropy;
}

export function computeSeedHash(
  address: Address,
  offset: U64,
  partitionHash: H256,
  chainId: U64
): Uint8Array {
  const hasher = createHash("sha256");
  hasher.update(address);
  hasher.update(partitionHash);
  hasher.update(bigIntToBytes(chainId, 8));
  hasher.update(bigIntToBytes(offset, 8));
  return hasher.digest();
}

async function unpackChunk(
  chunk: PackedChunk,
  // storageConfig: StorageConfig,
  chunkSize: number,
  entropyPackingIterations: number,
  chainId: bigint
): Promise<UnpackedChunk> {
  const entropy = await computeEntropyChunk(
    chunk.packingAddress,
    BigInt(chunk.partitionOffset),
    chunk.partitionHash,
    entropyPackingIterations,
    chunkSize,
    chainId
  );
  // xor and slice
  let data = packingXor(entropy, chunk.bytes, chunkSize);

  const bnChunkSize = BigInt(chunkSize);
  // const biTxOffset = BigInt(txOffset);
  const numChunksInTx = Number(bigIntDivCeil(chunk.dataSize, bnChunkSize));

  if (chunk.txOffset === numChunksInTx - 1) {
    // slice it
    const tail = chunk.dataSize % bnChunkSize;
    data = data.subarray(0, Number(tail));
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
  chunkSize: number
): Uint8Array {
  if (entropy.byteLength !== chunkSize)
    throw new Error("Entropy needs to be exactly chunkSize bytes");
  if (data.byteLength > entropy.byteLength)
    throw new Error("Data cannot be longer than entropy");

  for (let i = 0; i < data.byteLength; i++) {
    entropy[i] = entropy[i] ^ data[i];
  }
  return entropy;
}

export async function computeEntropyChunkWebCrypto(
  packingAddress: Address,
  partitionOffset: bigint,
  partitionHash: FixedUint8Array<32>,
  entropyPackingIterations: number,
  chunkSize: number,
  chainId: U64
): Promise<Uint8Array> {
  let previousSegment = await computeSeedHashWebCrypto(
    packingAddress,
    partitionOffset,
    partitionHash, //  toFixedUnint8Array(decodeBase58ToBuf(chunk.partitionHash), 32)
    chainId
  );
  //   console.log("PSEG", previousSegment);
  const outputEntropy = new Uint8Array(chunkSize);
  let outputCursor = 0;
  let hashCount = chunkSize / SHA_HASH_SIZE;
  for (let i = 0; i < hashCount; i++) {
    previousSegment = createHash("sha256").update(previousSegment).digest();
    for (let j = 0; j < SHA_HASH_SIZE; j++) {
      outputEntropy[outputCursor++] = previousSegment[j];
    }
  }
  // 2D hash packing
  const hashComponents = new Uint8Array(2 * SHA_HASH_SIZE);
  while (hashCount < entropyPackingIterations) {
    const i = (hashCount % (chunkSize / SHA_HASH_SIZE)) * SHA_HASH_SIZE;

    if (i === 0) {
      hashComponents.set(outputEntropy.subarray(chunkSize - SHA_HASH_SIZE), 0);
    } else {
      hashComponents.set(outputEntropy.subarray(i - SHA_HASH_SIZE, i), 0);
    }
    hashComponents.set(
      outputEntropy.subarray(i, i + SHA_HASH_SIZE),
      SHA_HASH_SIZE
    );

    const hash3 = new Uint8Array(
      await webcrypto.subtle.digest("SHA-256", hashComponents)
    );

    outputEntropy.set(hash3, i);
    hashCount++;
  }

  return outputEntropy;
}

export async function computeSeedHashWebCrypto(
  address: Address,
  offset: U64,
  partitionHash: H256,
  chainId: U64
): Promise<Uint8Array> {
  const res2 = new Uint8Array(
    await webcrypto.subtle.digest(
      "SHA-256",
      concatBuffers([
        address,
        partitionHash,
        bigIntToBytes(chainId, 8),
        bigIntToBytes(offset, 8),
      ])
    )
  );
  return res2;
}

