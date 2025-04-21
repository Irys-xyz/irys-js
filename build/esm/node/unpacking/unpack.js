import { createHash, webcrypto } from "crypto";
import { bigIntDivCeil, bigIntToBytes, concatBuffers, createFixedUint8Array, toFixedUint8Array, } from "../../common/utils.js";
import { SHA_HASH_SIZE } from "../../common/constants.js";
import { getBytes } from "ethers/utils";
import { arrayCompare } from "../../common/merkle.js";
import { PackedChunk } from "../../common/chunk.js";
import { UnpackedChunk } from "../../common/chunk.js";
import IrysClient from "../index.js";
export async function computeEntropyChunk(packingAddress, partitionOffset, partitionHash, entropyPackingIterations, chunkSize, chainId) {
    let previousSegment = await computeSeedHash(packingAddress, partitionOffset, partitionHash, //  toFixedUnint8Array(decodeBase58ToBuf(chunk.partitionHash), 32)
    chainId);
    //   console.log("PSEG", previousSegment);
    const outputEntropy = new Uint8Array(chunkSize);
    let outputCursor = 0;
    let hashCount = chunkSize / SHA_HASH_SIZE;
    for (let i = 0; i < hashCount; i++) {
        previousSegment = createHash("sha-256").update(previousSegment).digest();
        for (let j = 0; j < SHA_HASH_SIZE; j++) {
            outputEntropy[outputCursor++] = previousSegment[j];
        }
    }
    // 2D hash packing
    while (hashCount < entropyPackingIterations) {
        const i = (hashCount % (chunkSize / SHA_HASH_SIZE)) * SHA_HASH_SIZE;
        const hasher = createHash("sha-256");
        if (i === 0) {
            hasher.update(outputEntropy.subarray(chunkSize - SHA_HASH_SIZE));
        }
        else {
            hasher.update(outputEntropy.subarray(i - SHA_HASH_SIZE, i));
        }
        hasher.update(outputEntropy.subarray(i, i + SHA_HASH_SIZE));
        const hash = hasher.digest();
        outputEntropy.set(hash, i);
        hashCount++;
    }
    return outputEntropy;
}
export async function computeSeedHash(address, offset, partitionHash, chainId) {
    const hasher = createHash("sha-256");
    hasher.update(address);
    hasher.update(partitionHash);
    hasher.update(bigIntToBytes(chainId, 8));
    hasher.update(bigIntToBytes(offset, 8));
    return hasher.digest();
}
async function unpackChunk(chunk, 
// storageConfig: StorageConfig,
chunkSize, entropyPackingIterations, chainId) {
    const entropy = await computeEntropyChunk(chunk.packingAddress, BigInt(chunk.partitionOffset), chunk.partitionHash, entropyPackingIterations, chunkSize, chainId);
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
function packingXor(entropy, data, chunkSize) {
    if (entropy.byteLength !== chunkSize)
        throw new Error("Entropy needs to be exactly chunkSize bytes");
    if (data.byteLength > entropy.byteLength)
        throw new Error("Data cannot be longer than entropy");
    for (let i = 0; i < data.byteLength; i++) {
        entropy[i] = entropy[i] ^ data[i];
    }
    return entropy;
}
export async function computeEntropyChunkWebCrypto(packingAddress, partitionOffset, partitionHash, entropyPackingIterations, chunkSize, chainId) {
    let previousSegment = await computeSeedHashWebCrypto(packingAddress, partitionOffset, partitionHash, //  toFixedUnint8Array(decodeBase58ToBuf(chunk.partitionHash), 32)
    chainId);
    //   console.log("PSEG", previousSegment);
    const outputEntropy = new Uint8Array(chunkSize);
    let outputCursor = 0;
    let hashCount = chunkSize / SHA_HASH_SIZE;
    for (let i = 0; i < hashCount; i++) {
        previousSegment = createHash("sha-256").update(previousSegment).digest();
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
        }
        else {
            hashComponents.set(outputEntropy.subarray(i - SHA_HASH_SIZE, i), 0);
        }
        hashComponents.set(outputEntropy.subarray(i, i + SHA_HASH_SIZE), SHA_HASH_SIZE);
        const hash3 = new Uint8Array(await webcrypto.subtle.digest("SHA-256", hashComponents));
        outputEntropy.set(hash3, i);
        hashCount++;
    }
    return outputEntropy;
}
export async function computeSeedHashWebCrypto(address, offset, partitionHash, chainId) {
    const res2 = new Uint8Array(await webcrypto.subtle.digest("SHA-256", concatBuffers([
        address,
        partitionHash,
        bigIntToBytes(chainId, 8),
        bigIntToBytes(offset, 8),
    ])));
    return res2;
}
export async function testEntropyGen() {
    const parityChunkHash = new Uint8Array([
        105, 169, 178, 202, 79, 182, 172, 129, 31, 175, 161, 124, 40, 79, 26, 37,
        178, 3, 78, 115, 102, 77, 87, 122, 52, 48, 204, 162, 92, 96, 231, 161,
    ]);
    const chainId = 1275n;
    const chunkSize = 256 * 1024;
    const miningAddress = toFixedUint8Array(getBytes("0x64f1a2829e0e698c18e7792d6e74f67d89aa0a32"), 20);
    const chunkOffset = 7n;
    const partitionHash = createFixedUint8Array(32).fill(2);
    const iterations = 1_000_000;
    const now = performance.now();
    const entropyChunk = await computeEntropyChunk(miningAddress, chunkOffset, partitionHash, iterations, chunkSize, chainId);
    const chunkHash = createHash("sha-256").update(entropyChunk).digest();
    if (!arrayCompare(chunkHash, parityChunkHash))
        throw new Error("Entropy chunk parity mismatch!");
    console.log(performance.now() - now);
    const then = performance.now();
    const entropyChunkWeb = await computeEntropyChunkWebCrypto(miningAddress, chunkOffset, partitionHash, iterations, chunkSize, chainId);
    const chunkHash2 = createHash("sha-256").update(entropyChunkWeb).digest();
    if (!arrayCompare(chunkHash2, parityChunkHash))
        throw new Error("Web Entropy chunk parity mismatch!");
    console.log(performance.now() - then);
}
async function testPacking() {
    const chainId = 1275n;
    const chunkSize = 256 * 1024;
    const miningAddress = toFixedUint8Array(getBytes("0x64f1a2829e0e698c18e7792d6e74f67d89aa0a32"), 20);
    const chunkOffset = 7n;
    const partitionHash = createFixedUint8Array(32).fill(2);
    const iterations = 1_000_000;
    const expectedData = new Uint8Array([1, 2, 3, 4, 5]);
    const entropy = await computeEntropyChunk(miningAddress, chunkOffset, partitionHash, iterations, chunkSize, chainId);
    const packedData = packingXor(entropy, expectedData, chunkSize);
    const packedChunk = new PackedChunk(await new IrysClient(), {
        dataRoot: createFixedUint8Array(32),
        dataSize: BigInt(expectedData.byteLength),
        dataPath: new Uint8Array(10),
        txOffset: 0,
        bytes: packedData,
        packingAddress: miningAddress,
        partitionOffset: Number(chunkOffset),
        partitionHash: partitionHash,
    });
    const unpackedChunk = await unpackChunk(packedChunk, chunkSize, iterations, chainId);
    console.log(arrayCompare(unpackedChunk.bytes, expectedData));
}
(async function () {
    // await testEntropyGen();
    await testPacking();
})();
//# sourceMappingURL=unpack.js.map