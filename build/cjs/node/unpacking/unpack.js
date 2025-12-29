"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEntropyGen = exports.computeSeedHashWebCrypto = exports.computeEntropyChunkWebCrypto = exports.computeSeedHash = exports.computeEntropyChunk = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
const utils_2 = require("ethers/utils");
const chunk_1 = require("../../common/chunk");
const chunk_2 = require("../../common/chunk");
const __1 = tslib_1.__importDefault(require(".."));
async function computeEntropyChunk(packingAddress, partitionOffset, partitionHash, entropyPackingIterations, chunkSize, chainId) {
    let previousSegment = await computeSeedHash(packingAddress, partitionOffset, partitionHash, //  toFixedUnint8Array(decodeBase58ToBuf(chunk.partitionHash), 32)
    chainId);
    //   console.log("PSEG", previousSegment);
    const outputEntropy = new Uint8Array(chunkSize);
    let outputCursor = 0;
    let hashCount = chunkSize / constants_1.SHA_HASH_SIZE;
    for (let i = 0; i < hashCount; i++) {
        previousSegment = (0, crypto_1.createHash)("sha-256").update(previousSegment).digest();
        for (let j = 0; j < constants_1.SHA_HASH_SIZE; j++) {
            outputEntropy[outputCursor++] = previousSegment[j];
        }
    }
    // 2D hash packing
    while (hashCount < entropyPackingIterations) {
        const i = (hashCount % (chunkSize / constants_1.SHA_HASH_SIZE)) * constants_1.SHA_HASH_SIZE;
        const hasher = (0, crypto_1.createHash)("sha-256");
        if (i === 0) {
            hasher.update(outputEntropy.subarray(chunkSize - constants_1.SHA_HASH_SIZE));
        }
        else {
            hasher.update(outputEntropy.subarray(i - constants_1.SHA_HASH_SIZE, i));
        }
        hasher.update(outputEntropy.subarray(i, i + constants_1.SHA_HASH_SIZE));
        const hash = hasher.digest();
        outputEntropy.set(hash, i);
        hashCount++;
    }
    return outputEntropy;
}
exports.computeEntropyChunk = computeEntropyChunk;
async function computeSeedHash(address, offset, partitionHash, chainId) {
    const hasher = (0, crypto_1.createHash)("sha-256");
    hasher.update(address);
    hasher.update(partitionHash);
    hasher.update((0, utils_1.bigIntToBytes)(chainId, 8));
    hasher.update((0, utils_1.bigIntToBytes)(offset, 8));
    return hasher.digest();
}
exports.computeSeedHash = computeSeedHash;
async function unpackChunk(chunk, 
// storageConfig: StorageConfig,
chunkSize, entropyPackingIterations, chainId) {
    const entropy = await computeEntropyChunk(chunk.packingAddress, BigInt(chunk.partitionOffset), chunk.partitionHash, entropyPackingIterations, chunkSize, chainId);
    // xor and slice
    let data = packingXor(entropy, chunk.bytes, chunkSize);
    const bnChunkSize = BigInt(chunkSize);
    // const biTxOffset = BigInt(txOffset);
    const numChunksInTx = Number((0, utils_1.bigIntDivCeil)(chunk.dataSize, bnChunkSize));
    if (chunk.txOffset === numChunksInTx - 1) {
        // slice it
        const tail = chunk.dataSize % bnChunkSize;
        data = data.subarray(0, Number(tail));
    }
    return new chunk_2.UnpackedChunk({
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
async function computeEntropyChunkWebCrypto(packingAddress, partitionOffset, partitionHash, entropyPackingIterations, chunkSize, chainId) {
    let previousSegment = await computeSeedHashWebCrypto(packingAddress, partitionOffset, partitionHash, //  toFixedUnint8Array(decodeBase58ToBuf(chunk.partitionHash), 32)
    chainId);
    //   console.log("PSEG", previousSegment);
    const outputEntropy = new Uint8Array(chunkSize);
    let outputCursor = 0;
    let hashCount = chunkSize / constants_1.SHA_HASH_SIZE;
    for (let i = 0; i < hashCount; i++) {
        previousSegment = (0, crypto_1.createHash)("sha-256").update(previousSegment).digest();
        for (let j = 0; j < constants_1.SHA_HASH_SIZE; j++) {
            outputEntropy[outputCursor++] = previousSegment[j];
        }
    }
    // 2D hash packing
    const hashComponents = new Uint8Array(2 * constants_1.SHA_HASH_SIZE);
    while (hashCount < entropyPackingIterations) {
        const i = (hashCount % (chunkSize / constants_1.SHA_HASH_SIZE)) * constants_1.SHA_HASH_SIZE;
        if (i === 0) {
            hashComponents.set(outputEntropy.subarray(chunkSize - constants_1.SHA_HASH_SIZE), 0);
        }
        else {
            hashComponents.set(outputEntropy.subarray(i - constants_1.SHA_HASH_SIZE, i), 0);
        }
        hashComponents.set(outputEntropy.subarray(i, i + constants_1.SHA_HASH_SIZE), constants_1.SHA_HASH_SIZE);
        const hash3 = new Uint8Array(await crypto_1.webcrypto.subtle.digest("SHA-256", hashComponents));
        outputEntropy.set(hash3, i);
        hashCount++;
    }
    return outputEntropy;
}
exports.computeEntropyChunkWebCrypto = computeEntropyChunkWebCrypto;
async function computeSeedHashWebCrypto(address, offset, partitionHash, chainId) {
    const res2 = new Uint8Array(await crypto_1.webcrypto.subtle.digest("SHA-256", (0, utils_1.concatBuffers)([
        address,
        partitionHash,
        (0, utils_1.bigIntToBytes)(chainId, 8),
        (0, utils_1.bigIntToBytes)(offset, 8),
    ])));
    return res2;
}
exports.computeSeedHashWebCrypto = computeSeedHashWebCrypto;
async function testEntropyGen() {
    const parityChunkHash = new Uint8Array([
        105, 169, 178, 202, 79, 182, 172, 129, 31, 175, 161, 124, 40, 79, 26, 37,
        178, 3, 78, 115, 102, 77, 87, 122, 52, 48, 204, 162, 92, 96, 231, 161,
    ]);
    const chainId = 1275n;
    const chunkSize = 256 * 1024;
    const miningAddress = (0, utils_1.toFixedUint8Array)((0, utils_2.getBytes)("0x64f1a2829e0e698c18e7792d6e74f67d89aa0a32"), 20);
    const chunkOffset = 7n;
    const partitionHash = (0, utils_1.createFixedUint8Array)(32).fill(2);
    const iterations = 1_000_000;
    const now = performance.now();
    const entropyChunk = await computeEntropyChunk(miningAddress, chunkOffset, partitionHash, iterations, chunkSize, chainId);
    const chunkHash = (0, crypto_1.createHash)("sha-256").update(entropyChunk).digest();
    if (!(0, utils_1.arrayCompare)(chunkHash, parityChunkHash))
        throw new Error("Entropy chunk parity mismatch!");
    console.log(performance.now() - now);
    const then = performance.now();
    const entropyChunkWeb = await computeEntropyChunkWebCrypto(miningAddress, chunkOffset, partitionHash, iterations, chunkSize, chainId);
    const chunkHash2 = (0, crypto_1.createHash)("sha-256").update(entropyChunkWeb).digest();
    if (!(0, utils_1.arrayCompare)(chunkHash2, parityChunkHash))
        throw new Error("Web Entropy chunk parity mismatch!");
    console.log(performance.now() - then);
}
exports.testEntropyGen = testEntropyGen;
async function testPacking() {
    const chainId = 1275n;
    const chunkSize = 256 * 1024;
    const miningAddress = (0, utils_1.toFixedUint8Array)((0, utils_2.getBytes)("0x64f1a2829e0e698c18e7792d6e74f67d89aa0a32"), 20);
    const chunkOffset = 7n;
    const partitionHash = (0, utils_1.createFixedUint8Array)(32).fill(2);
    const iterations = 1_000_000;
    const expectedData = new Uint8Array([1, 2, 3, 4, 5]);
    const entropy = await computeEntropyChunk(miningAddress, chunkOffset, partitionHash, iterations, chunkSize, chainId);
    const packedData = packingXor(entropy, expectedData, chunkSize);
    const packedChunk = new chunk_1.PackedChunk(await new __1.default(), {
        dataRoot: (0, utils_1.createFixedUint8Array)(32),
        dataSize: BigInt(expectedData.byteLength),
        dataPath: new Uint8Array(10),
        txOffset: 0,
        bytes: packedData,
        packingAddress: miningAddress,
        partitionOffset: Number(chunkOffset),
        partitionHash: partitionHash,
    });
    const unpackedChunk = await unpackChunk(packedChunk, chunkSize, iterations, chainId);
    console.log((0, utils_1.arrayCompare)(unpackedChunk.bytes, expectedData));
}
(async function () {
    // await testEntropyGen();
    await testPacking();
})();
//# sourceMappingURL=unpack.js.map