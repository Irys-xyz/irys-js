import type CryptoInterface from "./cryptoInterface";
import type { StorageConfig } from "./storageConfig";
import type { Chunks } from "./dataTransaction";
import type { Data } from "./types";
export type MerkleChunk = {
    dataHash: Uint8Array;
    minByteRange: number;
    maxByteRange: number;
};
type BranchNode = {
    readonly id: Uint8Array;
    readonly type: "branch";
    readonly byteRange: number;
    readonly maxByteRange: number;
    readonly leftChild?: MerkleNode;
    readonly rightChild?: MerkleNode;
};
type LeafNode = {
    readonly id: Uint8Array;
    readonly dataHash: Uint8Array;
    readonly type: "leaf";
    readonly minByteRange: number;
    readonly maxByteRange: number;
};
export type MerkleNode = BranchNode | LeafNode;
export type MerkleProof = {
    offset: number;
    proof: Uint8Array;
};
type MerkleDeps = {
    crypto: Pick<CryptoInterface, "hash">;
    storageConfig: StorageConfig;
};
export declare class Merkle {
    deps: MerkleDeps;
    constructor(opts: {
        deps: MerkleDeps;
    });
    get storageConfig(): StorageConfig;
    /**
     * Takes the input data and chunks it into (mostly) equal sized chunks.
     * The last chunk will be a bit smaller as it contains the remainder
     * from the chunking process.
     */
    chunkData(data: Data): Promise<{
        chunks: MerkleChunk[];
        dataSize: number;
    }>;
    generateLeaves(chunks: MerkleChunk[], concurrency?: number): Promise<LeafNode[]>;
    /**
     * Builds a merkle tree and gets the root hash for the given input.
     */
    computeRootHash(data: Uint8Array): Promise<Uint8Array>;
    generateTree(data: Uint8Array): Promise<MerkleNode>;
    generateTransactionChunks(data: Data): Promise<{
        chunks: Chunks;
        dataSize: number;
    }>;
    /**
     * Starting with the bottom layer of leaf nodes, hash every second pair
     * into a new branch node, push those branch nodes onto a new layer,
     * and then recurse, building up the tree to it's root, where the
     * layer only consists of two items.
     */
    buildLayers(nodes: MerkleNode[], level?: number): Promise<MerkleNode>;
    /**
     * Recursively search through all branches of the tree,
     * and generate a proof for each leaf node.
     */
    generateProofs(root: MerkleNode): MerkleProof[];
    resolveBranchProofs(node: MerkleNode, proof?: Uint8Array, depth?: number): MerkleProof | MerkleProof[];
    validatePath(id: Uint8Array, dest: number, leftBound: number, rightBound: number, path: Uint8Array): Promise<false | {
        offset: number;
        leftBound: number;
        rightBound: number;
        chunkSize: number;
    }>;
    hashBranch(left: MerkleNode, right: MerkleNode): Promise<MerkleNode>;
    protected hash(data: Uint8Array | Uint8Array[]): Promise<Uint8Array>;
    /**
     * Inspect a chunk proof.
     * Takes proof, parses, reads and displays the values for console logging.
     * One proof section per line
     * Format: left,right,offset => hash
     */
    debug(proof: Uint8Array, output?: string): Promise<string>;
}
export declare function arrayFlatten<T = any>(input: T[]): T[];
export declare function intToBuffer(note: number): Uint8Array;
export declare function bufferToInt(buffer: Uint8Array): number;
export declare const arrayCompare: (a: Uint8Array | any[], b: Uint8Array | any[]) => boolean;
export default Merkle;
