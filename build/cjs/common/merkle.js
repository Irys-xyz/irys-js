"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToInt = exports.intToBuffer = exports.arrayFlatten = exports.Merkle = void 0;
const chunker_1 = require("./chunker");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
class Merkle {
    constructor(opts) {
        this.deps = opts.deps;
    }
    get storageConfig() {
        return this.deps.storageConfig;
    }
    /**
     * Takes the input data and chunks it into (mostly) equal sized chunks.
     * The last chunk will be a bit smaller as it contains the remainder
     * from the chunking process.
     */
    async chunkData(data) {
        const chunks = [];
        // let rest = data as Uint8Array;
        let cursor = 0;
        for await (const chunk of (0, chunker_1.chunker)(+this.storageConfig.chunkSize, {
            flush: true,
        })(data)) {
            const dataHash = await this.deps.crypto.hash(chunk);
            cursor += chunk.byteLength;
            chunks.push({
                dataHash,
                minByteRange: cursor - chunk.byteLength,
                maxByteRange: cursor,
            });
        }
        return { chunks, dataSize: cursor };
        // while (rest.byteLength >= this.storageConfig.chunkSize) {
        //   const chunkSize = this.storageConfig.chunkSize;
        //   // If the total bytes left will produce a chunk < MIN_CHUNK_SIZE,
        //   // then adjust the amount we put in this 2nd last chunk.
        //   // const nextChunkSize = rest.byteLength - this.storageConfig.chunkSize;
        //   // if (nextChunkSize > 0 && nextChunkSize < MIN_CHUNK_SIZE) {
        //   //   chunkSize = Math.ceil(rest.byteLength / 2);
        //   //   // console.log(`Last chunk will be: ${nextChunkSize} which is below ${MIN_CHUNK_SIZE}, adjusting current to ${chunkSize} with ${rest.byteLength} left.`)
        //   // }
        //   const chunk = rest.slice(0, chunkSize);
        //   rest = rest.slice(chunkSize);
        // }
        // chunks.push({
        //   dataHash: await this.deps.crypto.hash(rest),
        //   minByteRange: cursor,
        //   maxByteRange: cursor + rest.byteLength,
        // });
        // return chunks;
    }
    async generateLeaves(chunks, concurrency = 10) {
        return await (0, utils_1.promisePool)(chunks, async ({ dataHash, minByteRange, maxByteRange }) => {
            return {
                type: "leaf",
                id: await this.hash(await Promise.all([
                    this.hash(dataHash),
                    this.hash(intToBuffer(maxByteRange)),
                ])),
                dataHash: dataHash,
                minByteRange,
                maxByteRange,
            };
        }, { concurrency });
    }
    /**
     * Builds a merkle tree and gets the root hash for the given input.
     */
    async computeRootHash(data) {
        const rootNode = await this.generateTree(data);
        return rootNode.id;
    }
    async generateTree(data) {
        const { chunks } = await this.chunkData(data);
        const rootNode = await this.buildLayers(await this.generateLeaves(chunks));
        return rootNode;
    }
    async generateTransactionChunks(data) {
        const { chunks, dataSize } = await this.chunkData(data);
        const leaves = await this.generateLeaves(chunks);
        const root = await this.buildLayers(leaves);
        const proofs = await this.generateProofs(root);
        // // Discard the last chunk & proof if it's zero length.
        // const lastChunk = chunks.slice(-1)[0];
        // if (lastChunk.maxByteRange - lastChunk.minByteRange === 0) {
        //   chunks.splice(chunks.length - 1, 1);
        //   proofs.splice(proofs.length - 1, 1);
        // }
        return {
            chunks: {
                dataRoot: root.id,
                chunks,
                proofs,
            },
            dataSize,
        };
    }
    /**
     * Starting with the bottom layer of leaf nodes, hash every second pair
     * into a new branch node, push those branch nodes onto a new layer,
     * and then recurse, building up the tree to it's root, where the
     * layer only consists of two items.
     */
    async buildLayers(nodes, level = 0) {
        // If there is only 1 node left, this is going to be the root node
        if (nodes.length < 2) {
            const root = nodes[0];
            // console.log("Root layer", root);
            return root;
        }
        const nextLayer = [];
        for (let i = 0; i < nodes.length; i += 2) {
            nextLayer.push(await this.hashBranch(nodes[i], nodes[i + 1]));
        }
        // console.log("Layer", nextLayer);
        return this.buildLayers(nextLayer, level + 1);
    }
    /**
     * Recursively search through all branches of the tree,
     * and generate a proof for each leaf node.
     */
    generateProofs(root) {
        const proofs = this.resolveBranchProofs(root);
        if (!Array.isArray(proofs)) {
            return [proofs];
        }
        return arrayFlatten(proofs);
    }
    resolveBranchProofs(node, proof = new Uint8Array(), depth = 0) {
        if (node.type === "leaf") {
            return {
                offset: node.maxByteRange - 1,
                proof: (0, utils_1.concatBuffers)([
                    proof,
                    node.dataHash,
                    intToBuffer(node.maxByteRange),
                ]),
            };
        }
        if (node.type === "branch") {
            const partialProof = (0, utils_1.concatBuffers)([
                proof,
                node.leftChild.id,
                node.rightChild.id,
                intToBuffer(node.byteRange),
            ]);
            return [
                this.resolveBranchProofs(node.leftChild, partialProof, depth + 1),
                this.resolveBranchProofs(node.rightChild, partialProof, depth + 1),
            ];
        }
        throw new Error(`Unexpected node type`);
    }
    async validatePath(id, dest, leftBound, rightBound, path) {
        if (rightBound <= 0) {
            return false;
        }
        if (dest >= rightBound) {
            return this.validatePath(id, 0, rightBound - 1, rightBound, path);
        }
        if (dest < 0) {
            return this.validatePath(id, 0, 0, rightBound, path);
        }
        if (path.length === constants_1.MERKLE_HASH_SIZE + constants_1.MERKLE_NOTE_SIZE) {
            const pathData = path.slice(0, constants_1.MERKLE_HASH_SIZE);
            const endOffsetBuffer = path.slice(pathData.length, pathData.length + constants_1.MERKLE_NOTE_SIZE);
            const pathDataHash = await this.hash([
                await this.hash(pathData),
                await this.hash(endOffsetBuffer),
            ]);
            const result = (0, utils_1.arrayCompare)(id, pathDataHash);
            if (result) {
                return {
                    offset: rightBound - 1,
                    leftBound: leftBound,
                    rightBound: rightBound,
                    chunkSize: rightBound - leftBound,
                };
            }
            return false;
        }
        const left = path.slice(0, constants_1.MERKLE_HASH_SIZE);
        const right = path.slice(left.length, left.length + constants_1.MERKLE_HASH_SIZE);
        const offsetBuffer = path.slice(left.length + right.length, left.length + right.length + constants_1.MERKLE_NOTE_SIZE);
        const offset = bufferToInt(offsetBuffer);
        const remainder = path.slice(left.length + right.length + offsetBuffer.length);
        const pathHash = await this.hash([
            await this.hash(left),
            await this.hash(right),
            await this.hash(offsetBuffer),
        ]);
        if ((0, utils_1.arrayCompare)(id, pathHash)) {
            if (dest < offset) {
                return await this.validatePath(left, dest, leftBound, Math.min(rightBound, offset), remainder);
            }
            return await this.validatePath(right, dest, Math.max(leftBound, offset), rightBound, remainder);
        }
        return false;
    }
    async hashBranch(left, right) {
        if (!right) {
            return left;
        }
        const branch = {
            type: "branch",
            id: await this.hash([
                await this.hash(left.id),
                await this.hash(right.id),
                await this.hash(intToBuffer(left.maxByteRange)),
            ]),
            byteRange: left.maxByteRange,
            maxByteRange: right.maxByteRange,
            leftChild: left,
            rightChild: right,
        };
        return branch;
    }
    async hash(data) {
        if (Array.isArray(data)) {
            data = (0, utils_1.concatBuffers)(data);
        }
        return new Uint8Array(await this.deps.crypto.hash(data));
    }
    /**
     * Inspect a chunk proof.
     * Takes proof, parses, reads and displays the values for console logging.
     * One proof section per line
     * Format: left,right,offset => hash
     */
    async debug(proof, output = "") {
        if (proof.byteLength < 1) {
            return output;
        }
        const left = proof.slice(0, constants_1.MERKLE_HASH_SIZE);
        const right = proof.slice(left.length, left.length + constants_1.MERKLE_HASH_SIZE);
        const offsetBuffer = proof.slice(left.length + right.length, left.length + right.length + constants_1.MERKLE_NOTE_SIZE);
        const offset = bufferToInt(offsetBuffer);
        const remainder = proof.slice(left.length + right.length + offsetBuffer.length);
        const pathHash = await this.hash([
            await this.hash(left),
            await this.hash(right),
            await this.hash(offsetBuffer),
        ]);
        const updatedOutput = `${output}\n${JSON.stringify(left)},${JSON.stringify(right)},${offset} => ${JSON.stringify(pathHash)}`;
        return this.debug(remainder, updatedOutput);
    }
}
exports.Merkle = Merkle;
function arrayFlatten(input) {
    return input.flat(Infinity);
}
exports.arrayFlatten = arrayFlatten;
function intToBuffer(note) {
    const buffer = new Uint8Array(constants_1.MERKLE_NOTE_SIZE);
    for (let i = buffer.length - 1; i >= 0; i--) {
        const byte = note % 256;
        buffer[i] = byte;
        note = (note - byte) / 256;
    }
    return buffer;
}
exports.intToBuffer = intToBuffer;
function bufferToInt(buffer) {
    let value = 0;
    for (let i = 0; i < buffer.length; i++) {
        value *= 256;
        value += buffer[i];
    }
    return value;
}
exports.bufferToInt = bufferToInt;
exports.default = Merkle;
//# sourceMappingURL=merkle.js.map