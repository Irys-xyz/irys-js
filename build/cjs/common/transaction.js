"use strict";
/* eslint-disable no-case-declarations */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignedTransaction = exports.UnsignedTransaction = void 0;
const tslib_1 = require("tslib");
const utils_1 = require("./utils");
const merkle_1 = require("./merkle");
const rlp_1 = require("rlp");
const ethers_1 = require("ethers");
const ethers_2 = require("ethers");
const constants_1 = require("./constants");
const chunk_1 = require("./chunk");
const chunker_1 = require("./chunker");
const async_retry_1 = tslib_1.__importDefault(require("async-retry"));
const requiredUnsignedTxHeaderProps = [
    "version",
    "anchor",
    "signer",
    "dataRoot",
    "dataSize",
    "termFee",
    "ledgerId",
    "chainId",
];
const requiredSignedTxHeaderProps = [
    ...requiredUnsignedTxHeaderProps,
    "id",
    "signature",
];
const fullSignedTxHeaderProps = [
    ...requiredSignedTxHeaderProps,
    "bundleFormat",
    "permFee",
];
const fullSignedTxProps = [...fullSignedTxHeaderProps, "chunks"];
class UnsignedTransaction {
    constructor(irys, attributes) {
        this.version = 0;
        this.id = undefined;
        this.anchor = undefined;
        this.signer = undefined;
        this.dataRoot = undefined;
        this.dataSize = 0n;
        this.termFee = 0n;
        this.chainId = constants_1.IRYS_TESTNET_CHAIN_ID;
        this.signature = undefined;
        this.bundleFormat = 0n;
        this.permFee = undefined;
        this.ledgerId = 0;
        // super();
        this.irys = irys;
        if (attributes)
            Object.assign(this, attributes);
    }
    get missingProperties() {
        return requiredUnsignedTxHeaderProps.reduce((acc, k) => {
            if (this[k] === undefined)
                acc.push(k);
            return acc;
        }, []);
    }
    ledger(ledgerId) {
        this.ledgerId = ledgerId;
        return this;
    }
    async fillFee() {
        if (this.ledgerId === undefined)
            throw new Error("missing required field ledgerId");
        // if we're ledger 0, get term & perm fee
        if (this.ledgerId === 0) {
            this.permFee = await this.irys.utils.getPrice(this.dataSize, 0);
            this.termFee = await this.irys.utils.getPrice(this.dataSize, 1);
        }
        else {
            this.termFee = await this.irys.utils.getPrice(this.dataSize, this.ledgerId);
        }
        return this;
    }
    async getFees() {
        await this.fillFee();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { termFee: this.termFee, permFee: this.permFee };
    }
    async getFee() {
        await this.fillFee();
        return this.termFee + this.permFee;
    }
    async fillAnchor() {
        const apiAnchor = await this.irys.api.get("/block/latest");
        if (apiAnchor.data.blockHash) {
            this.anchor = (0, utils_1.toFixedUint8Array)((0, utils_1.decodeBase58ToBuf)(apiAnchor.data.blockHash), 32);
        }
        else {
            this.anchor = (0, utils_1.createFixedUint8Array)(32).fill(1);
        }
        return this;
    }
    throwOnMissing() {
        const missing = this.missingProperties;
        if (missing.length)
            throw new Error(`Missing required properties: ${missing.join(", ")}`);
    }
    async sign(key) {
        const signingKey = typeof key === "string" ? new ethers_1.SigningKey(key) : key;
        this.signer ??= (0, utils_1.toFixedUint8Array)((0, ethers_2.getBytes)((0, ethers_2.computeAddress)(signingKey.publicKey)), 20);
        if (!this.anchor)
            await this.fillAnchor();
        if (!this.termFee)
            await this.fillFee();
        const prehash = await this.getSignatureData();
        const signature = signingKey.sign(prehash);
        this.signature = (0, utils_1.toFixedUint8Array)((0, ethers_2.getBytes)(signature.serialized), 65);
        if ((0, ethers_2.hexlify)(this.signature) !== signature.serialized) {
            throw new Error();
        }
        const idBytes = (0, ethers_2.getBytes)((0, ethers_2.keccak256)(signature.serialized));
        this.id = (0, ethers_2.encodeBase58)((0, utils_1.toFixedUint8Array)(idBytes, 32));
        return new SignedTransaction(this.irys, this);
    }
    // prepares some data into chunks, associating them with this transaction instance
    // note: this will *consume any provided async iterable* - you will need to provide a second instance for the `uploadChunks` function
    // if your data is small enough, I recommend converting it to a buffer/Uint8Array beforehand
    async prepareChunks(data) {
        const { chunks, dataSize } = await this.irys.merkle.generateTransactionChunks(data);
        if (dataSize === 0) {
            this.chunks = undefined;
            this.dataRoot = undefined;
            return this;
        }
        this.chunks = chunks;
        this.dataSize = BigInt(dataSize);
        this.dataRoot = (0, utils_1.toFixedUint8Array)(this.chunks.dataRoot, 32);
        return this;
    }
    // / returns the "signature data" aka the prehash (hash of all the tx fields)
    getSignatureData() {
        switch (this.version) {
            case 0:
                // throw if any of the required fields are missing
                this.throwOnMissing();
                // RLP encoding - field ordering matters!
                const fields = [
                    this.version,
                    this.anchor,
                    this.signer,
                    this.dataRoot,
                    this.dataSize,
                    this.termFee,
                    this.ledgerId,
                    this.chainId,
                ];
                // Add optional fields only if they are defined
                if (this.bundleFormat !== undefined) {
                    fields.push(this.bundleFormat);
                }
                if (this.permFee !== undefined) {
                    fields.push(this.permFee);
                }
                const encoded = (0, rlp_1.encode)(fields);
                const prehash = (0, ethers_2.getBytes)((0, ethers_2.keccak256)(encoded));
                return Promise.resolve(prehash);
            default:
                throw new Error(`Unknown transaction version : ${this.version}`);
        }
    }
}
exports.UnsignedTransaction = UnsignedTransaction;
class SignedTransaction {
    constructor(irys, attributes) {
        this.bundleFormat = undefined;
        this.permFee = undefined;
        // super();
        this.irys = irys;
        // safer than object.assign, given we will be getting passed a class instance
        // this should "copy" over all header properties & chunks
        for (const k of fullSignedTxProps) {
            const v = attributes[k];
            if (v === undefined && requiredSignedTxHeaderProps.includes(k))
                throw new Error(`Unable to build signed transaction - missing field ${k}`);
            this[k] = v;
        }
    }
    get missingProperties() {
        return requiredSignedTxHeaderProps.reduce((acc, k) => {
            if (this[k] === undefined)
                acc.push(k);
            return acc;
        }, []);
    }
    throwOnMissing() {
        const missing = this.missingProperties;
        if (missing.length)
            throw new Error(`Missing required properties: ${missing.join(", ")}`);
    }
    getHeader() {
        return fullSignedTxHeaderProps.reduce((acc, k) => {
            acc[k] = this[k];
            return acc;
        }, {});
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return (0, utils_1.jsonBigIntSerialize)(this.encode());
    }
    get txId() {
        return this.id;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    encode() {
        return {
            id: this.id,
            version: this.version,
            anchor: (0, ethers_2.encodeBase58)(this.anchor),
            signer: (0, ethers_2.encodeBase58)(this.signer),
            dataRoot: (0, ethers_2.encodeBase58)(this.dataRoot),
            dataSize: this.dataSize.toString(),
            termFee: this.termFee.toString(),
            ledgerId: this.ledgerId,
            chainId: this.chainId.toString(),
            signature: (0, ethers_2.encodeBase58)(this.signature),
            bundleFormat: this.bundleFormat?.toString(),
            permFee: this.permFee?.toString(),
        };
    }
    // Returns an unpacked chunk, slicing from the provided full data
    async getChunk(idx, fullData) {
        if (!this.chunks) {
            throw new Error(`Chunks have not been prepared`);
        }
        const proof = this.chunks.proofs[idx];
        const chunk = this.chunks.chunks[idx];
        if (!(await this.irys.merkle.validatePath(this.dataRoot, Number((0, chunk_1.chunkEndByteOffset)(idx, this.dataSize, this.irys.storageConfig.chunkSize)), 0, Number(this.dataSize), proof.proof)))
            throw new Error("Invalid chunk, check your data");
        const sliced = fullData.subarray(chunk.minByteRange, chunk.maxByteRange);
        return new chunk_1.UnpackedChunk({
            dataRoot: this.dataRoot,
            dataSize: this.dataSize,
            dataPath: proof.proof,
            bytes: sliced,
            txOffset: idx,
        });
    }
    // Returns an unpacked chunk, passing through the provided data as the chunk's full data
    async getChunkPassthrough(idx, data) {
        if (!this.chunks) {
            throw new Error(`Chunks have not been prepared`);
        }
        const proof = this.chunks.proofs[idx];
        // const chunk = this.chunks.chunks[idx];
        if (!(await this.irys.merkle.validatePath(this.dataRoot, Number((0, chunk_1.chunkEndByteOffset)(idx, this.dataSize, this.irys.storageConfig.chunkSize)), 0, Number(this.dataSize), proof.proof)))
            throw new Error("Invalid chunk, check your data");
        return new chunk_1.UnpackedChunk({
            dataRoot: this.dataRoot,
            dataSize: this.dataSize,
            dataPath: proof.proof,
            bytes: data,
            txOffset: idx,
        });
    }
    // Uploads the transaction's header and chunks
    async upload(data, opts) {
        await this.uploadHeader(opts);
        await this.uploadChunks(data, opts);
    }
    async uploadHeader(apiConfig) {
        return await this.irys.api.post("/tx", this.toJSON(), {
            ...apiConfig,
            headers: { "Content-Type": "application/json" },
            validateStatus: (s) => s < 400,
        });
    }
    // Upload this transactions' chunks to the connected node
    // uploads using bound concurrency & retries
    async uploadChunks(data, opts) {
        await (0, utils_1.promisePool)((0, chunker_1.chunker)(this.irys.storageConfig.chunkSize, { flush: true })(data), (chunkData, idx) => (0, async_retry_1.default)(async (bail) => {
            const chunk = await this.getChunkPassthrough(idx, chunkData);
            // TODO: skip uploading if this chunk exists on the node.
            const serializedChunk = chunk.toJSON();
            const res = await this.irys.api.post("/chunk", serializedChunk, {
                headers: { "Content-Type": "application/json" },
            });
            if (res.status >= 400)
                bail(new Error(`Error uploading chunk ${idx}: ${res.statusText}`));
        }, { retries: 3, minTimeout: 300, maxTimeout: 1000, ...opts?.retry }), { concurrency: opts?.concurrency ?? 10, itemCb: opts?.onProgress });
    }
    // Validate the signature by computing the prehash and recovering the signer's address using the prehash and the signature.
    // compares the recovered signer address to the tx's address, and returns true if they match
    async validateSignature() {
        const prehash = await this.getSignatureData();
        const recoveredAddress = (0, ethers_2.getBytes)((0, ethers_2.recoverAddress)(prehash, (0, ethers_2.hexlify)(this.signature)));
        return (0, merkle_1.arrayCompare)(recoveredAddress, this.signer);
    }
    getSignatureData() {
        switch (this.version) {
            case 0:
                // throw if any of the required fields are missing
                this.throwOnMissing();
                // RLP encoding - field ordering matters!
                const fields = [
                    this.version,
                    this.anchor,
                    this.signer,
                    this.dataRoot,
                    this.dataSize,
                    this.termFee,
                    this.ledgerId,
                    this.chainId,
                ];
                // Add optional fields only if they are defined
                if (this.bundleFormat !== undefined) {
                    fields.push(this.bundleFormat);
                }
                if (this.permFee !== undefined) {
                    fields.push(this.permFee);
                }
                const encoded = (0, rlp_1.encode)(fields);
                const prehash = (0, ethers_2.getBytes)((0, ethers_2.keccak256)(encoded));
                return Promise.resolve(prehash);
            default:
                throw new Error(`Unknown transaction version : ${this.version}`);
        }
    }
}
exports.SignedTransaction = SignedTransaction;
//# sourceMappingURL=transaction.js.map