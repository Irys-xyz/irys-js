"use strict";
/* eslint-disable no-case-declarations */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignedDataTransaction = exports.DataTransactionVersion = exports.UnsignedDataTransaction = exports.DataLedgerId = void 0;
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
const api_1 = require("./api");
var DataLedgerId;
(function (DataLedgerId) {
    DataLedgerId[DataLedgerId["PUBLISH"] = 0] = "PUBLISH";
    DataLedgerId[DataLedgerId["SUBMIT"] = 1] = "SUBMIT";
})(DataLedgerId || (exports.DataLedgerId = DataLedgerId = {}));
const requiredUnsignedDataTxHeaderProps = [
    "version",
    "anchor",
    "signer",
    "dataRoot",
    "dataSize",
    "termFee",
    "ledgerId",
    "chainId",
    "headerSize",
];
const requiredSignedDataTxHeaderProps = [
    ...requiredUnsignedDataTxHeaderProps,
    "id",
    "signature",
];
const fullSignedDataTxHeaderProps = [
    ...requiredSignedDataTxHeaderProps,
    "bundleFormat",
    "permFee",
];
const fullSignedDataTxProps = [...fullSignedDataTxHeaderProps, "chunks"];
class UnsignedDataTransaction {
    constructor(irys, attributes) {
        this.version = DataTransactionVersion.V1;
        this.id = undefined;
        this.anchor = undefined;
        this.signer = undefined;
        this.dataRoot = undefined;
        this.dataSize = 0n;
        this.termFee = 0n;
        this.chainId = constants_1.IRYS_TESTNET_CHAIN_ID;
        this.signature = undefined;
        this.bundleFormat = undefined;
        this.permFee = undefined;
        this.ledgerId = DataLedgerId.PUBLISH;
        this.headerSize = 0n;
        // super();
        this.irys = irys;
        if (attributes)
            Object.assign(this, attributes);
    }
    get missingProperties() {
        return requiredUnsignedDataTxHeaderProps.reduce((acc, k) => {
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
            const priceInfo = await this.irys.network.getPrice(this.dataSize, 0);
            this.permFee = priceInfo.permFee;
            this.termFee = priceInfo.termFee;
        }
        else {
            const priceInfo = await this.irys.network.getPrice(this.dataSize, this.ledgerId);
            this.termFee = priceInfo.termFee;
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
        const apiAnchor = await this.irys.network.getAnchor();
        this.anchor = apiAnchor.blockHash;
        return this;
    }
    throwOnMissing() {
        const missing = this.missingProperties;
        if (missing.length)
            throw new Error(`Missing required properties: ${missing.join(", ")} - did you call tx.prepareChunks(<data>)?`);
    }
    async sign(key) {
        const signingKey = typeof key === "string"
            ? new ethers_1.SigningKey(key.startsWith("0x") ? key : `0x${key}`) // ethers requires the 0x prefix
            : key;
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
        return new SignedDataTransaction(this.irys, this);
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
            case DataTransactionVersion.V1:
                // throw if any of the required fields are missing
                this.throwOnMissing();
                // RLP encoding - field ordering matters!
                // BE VERY CAREFUL ABOUT HOW WE SERIALIZE AND DESERIALIZE
                // note: `undefined`/nullish and 0 serialize to the same thing
                // this is notable for `bundleFormat` and `permFee`
                const fields = [
                    this.version,
                    this.anchor,
                    this.signer,
                    this.dataRoot,
                    this.dataSize,
                    this.headerSize,
                    this.termFee,
                    this.ledgerId,
                    this.chainId,
                ];
                // Add optional fields only if they are defined
                // note: encode handles null/undefined fields
                fields.push(this.bundleFormat);
                fields.push(this.permFee);
                const encoded = (0, rlp_1.encode)(fields);
                const prehash = (0, ethers_2.getBytes)((0, ethers_2.keccak256)(encoded));
                return Promise.resolve(prehash);
            default:
                throw new Error(`Unknown transaction version : ${this.version}`);
        }
    }
}
exports.UnsignedDataTransaction = UnsignedDataTransaction;
var DataTransactionVersion;
(function (DataTransactionVersion) {
    DataTransactionVersion[DataTransactionVersion["V1"] = 1] = "V1";
})(DataTransactionVersion || (exports.DataTransactionVersion = DataTransactionVersion = {}));
class SignedDataTransaction {
    // TODO: implement! this is so we upload the last chunk _first_, which lets nodes confirm the data_size immediately
    // public lastChunk: Uint8Array | undefined;
    constructor(irys, attributes) {
        this.bundleFormat = undefined;
        this.permFee = undefined;
        // super();
        this.irys = irys;
        // safer than object.assign, given we will be getting passed a class instance
        // this should "copy" over all header properties & chunks
        for (const k of fullSignedDataTxProps) {
            const v = attributes[k];
            if (v === undefined && requiredSignedDataTxHeaderProps.includes(k))
                throw new Error(`Unable to build signed transaction - missing field ${k}`);
            this[k] = v;
        }
    }
    get missingProperties() {
        return requiredSignedDataTxHeaderProps.reduce((acc, k) => {
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
        return fullSignedDataTxHeaderProps.reduce((acc, k) => {
            acc[k] = this[k];
            return acc;
        }, {});
    }
    // if you want the encoded header without chunks, use `this.encode(false)`
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return JSON.stringify(this.encode(true));
    }
    get txId() {
        return this.id;
    }
    // prepares some data into chunks, associating them with this transaction instance
    // note: this will *consume any provided async iterable* - you will need to provide a second instance for the `uploadChunks` function
    // if your data is small enough, I recommend converting it to a buffer/Uint8Array beforehand
    async prepareChunks(data) {
        const { chunks, dataSize } = await this.irys.merkle.generateTransactionChunks(data);
        this.chunks = chunks;
        if (this.dataSize !== BigInt(dataSize))
            throw new Error("regenerated chunks dataSize mismatch");
        if (!(0, merkle_1.arrayCompare)(this.dataRoot, (0, utils_1.toFixedUint8Array)(this.chunks.dataRoot, 32)))
            throw new Error("regenerated chunks dataRoot mismatch");
        return this;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    encode(withChunks = false) {
        return {
            id: this.id,
            version: this.version,
            anchor: (0, ethers_2.encodeBase58)(this.anchor),
            signer: (0, ethers_2.encodeBase58)(this.signer),
            dataRoot: (0, ethers_2.encodeBase58)(this.dataRoot),
            dataSize: this.dataSize.toString(),
            headerSize: this.headerSize.toString(),
            termFee: this.termFee.toString(),
            ledgerId: this.ledgerId,
            chainId: this.chainId.toString(),
            signature: (0, ethers_2.encodeBase58)(this.signature),
            bundleFormat: this.bundleFormat?.toString(),
            permFee: this.permFee?.toString(),
            // TODO: add chunk serialization?
            chunks: withChunks ? JSON.stringify(this.chunks) : undefined,
        };
    }
    static decode(irys, encoded) {
        return new SignedDataTransaction(irys, {
            id: encoded.id,
            version: encoded.version,
            anchor: (0, utils_1.decodeBase58ToFixed)(encoded.anchor, 32),
            signer: (0, utils_1.decodeBase58ToFixed)(encoded.signer, 20),
            dataRoot: (0, utils_1.decodeBase58ToFixed)(encoded.dataRoot, 32),
            dataSize: BigInt(encoded.dataSize),
            headerSize: BigInt(encoded.headerSize),
            termFee: BigInt(encoded.termFee),
            ledgerId: encoded.ledgerId,
            chainId: BigInt(encoded.chainId),
            signature: (0, utils_1.decodeBase58ToFixed)(encoded.signature, 65),
            bundleFormat: encoded.bundleFormat
                ? BigInt(encoded.bundleFormat)
                : undefined,
            permFee: encoded.permFee ? BigInt(encoded.permFee) : undefined,
            chunks: encoded.chunks ? JSON.parse(encoded.chunks) : undefined,
        });
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
        const headerRes = await this.uploadHeader(opts);
        await this.uploadChunks(data, opts);
        return headerRes;
    }
    async uploadHeader(apiConfig) {
        return await this.irys.api.post(api_1.V1_API_ROUTES.POST_DATA_TX_HEADER, this.toJSON(), {
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
            const res = await this.irys.api.post(api_1.V1_API_ROUTES.POST_CHUNK, serializedChunk, {
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
            case DataTransactionVersion.V1:
                // throw if any of the required fields are missing
                this.throwOnMissing();
                // RLP encoding - field ordering matters!
                const fields = [
                    this.version,
                    this.anchor,
                    this.signer,
                    this.dataRoot,
                    this.dataSize,
                    this.headerSize,
                    this.termFee,
                    this.ledgerId,
                    this.chainId,
                ];
                // Add optional fields only if they are defined
                // note: encode handles null/undefined fields
                fields.push(this.bundleFormat);
                fields.push(this.permFee);
                const encoded = (0, rlp_1.encode)(fields);
                const prehash = (0, ethers_2.getBytes)((0, ethers_2.keccak256)(encoded));
                return Promise.resolve(prehash);
            default:
                throw new Error(`Unknown transaction version : ${this.version}`);
        }
    }
}
exports.SignedDataTransaction = SignedDataTransaction;
//# sourceMappingURL=dataTransaction.js.map