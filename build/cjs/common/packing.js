"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSeedHashWebCrypto = exports.computeEntropyChunkWebCrypto = exports.unpackChunk = exports.computeSeedHash = exports.computeEntropyChunk = void 0;
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const chunk_1 = require("./chunk");
async function computeEntropyChunk(packingAddress, partitionOffset, partitionHash, entropyPackingIterations, chunkSize, chainId) {
    let previousSegment = await computeSeedHash(packingAddress, partitionOffset, partitionHash, chainId);
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
async function unpackChunk(chunk, chunkSize, entropyPackingIterations, chainId) {
    const entropy = await computeEntropyChunk(chunk.packingAddress, BigInt(chunk.partitionOffset), chunk.partitionHash, entropyPackingIterations, chunkSize, chainId);
    // xor and slice
    let data = packingXor(entropy, chunk.bytes, chunkSize);
    const bnChunkSize = BigInt(chunkSize);
    const numChunksInTx = Number((0, utils_1.bigIntDivCeil)(chunk.dataSize, bnChunkSize));
    if (chunk.txOffset === numChunksInTx - 1) {
        // slice it
        const tail = chunk.dataSize % bnChunkSize;
        data = data.subarray(0, Number(tail));
    }
    return new chunk_1.UnpackedChunk({
        dataRoot: chunk.dataRoot,
        dataSize: chunk.dataSize,
        dataPath: chunk.dataPath,
        txOffset: chunk.txOffset,
        bytes: data,
    });
}
exports.unpackChunk = unpackChunk;
// consumes/overwrites `entropy`
function packingXor(entropy, data, chunkSize) {
    if (entropy.byteLength !== +chunkSize)
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
//# sourceMappingURL=packing.js.map