/* eslint-disable no-case-declarations */
import { arrayCompare, decodeBase58ToFixed, toFixedUint8Array } from "./utils.js";
import { encode } from "rlp";
import { SigningKey } from "ethers";
import { computeAddress, encodeBase58, getBytes, hexlify, keccak256, recoverAddress, } from "ethers";
import { IRYS_TESTNET_CHAIN_ID } from "./constants.js";
import { V1_API_ROUTES } from "./api.js";
const requiredUnsignedCommitmentTxHeaderProps = [
    "version",
    "anchor",
    "signer",
    "commitmentType",
    "fee",
    "value",
    "chainId",
];
const requiredSignedCommitmentTxHeaderProps = [
    ...requiredUnsignedCommitmentTxHeaderProps,
    "id",
    "signature",
];
const fullSignedCommitmentTxHeaderProps = [
    ...requiredSignedCommitmentTxHeaderProps,
    /*   "bundleFormat",
    "permFee", */
];
const fullSignedCommitmentTxProps = [
    ...fullSignedCommitmentTxHeaderProps /* "chunks" */,
];
export var CommitmentTypeId;
(function (CommitmentTypeId) {
    CommitmentTypeId[CommitmentTypeId["STAKE"] = 1] = "STAKE";
    CommitmentTypeId[CommitmentTypeId["PLEDGE"] = 2] = "PLEDGE";
    CommitmentTypeId[CommitmentTypeId["UNPLEDGE"] = 3] = "UNPLEDGE";
    CommitmentTypeId[CommitmentTypeId["UNSTAKE"] = 4] = "UNSTAKE";
})(CommitmentTypeId || (CommitmentTypeId = {}));
export var EncodedCommitmentTypeId;
(function (EncodedCommitmentTypeId) {
    EncodedCommitmentTypeId["STAKE"] = "stake";
    EncodedCommitmentTypeId["PLEDGE"] = "pledge";
    EncodedCommitmentTypeId["UNPLEDGE"] = "unpledge";
    EncodedCommitmentTypeId["UNSTAKE"] = "unstake";
})(EncodedCommitmentTypeId || (EncodedCommitmentTypeId = {}));
function decodeCommitmentType(enc) {
    switch (enc.type) {
        case EncodedCommitmentTypeId.STAKE:
            return { type: CommitmentTypeId.STAKE };
        case EncodedCommitmentTypeId.PLEDGE:
            return {
                type: CommitmentTypeId.PLEDGE,
                pledgeCountBeforeExecuting: BigInt(enc.pledgeCountBeforeExecuting),
            };
        case EncodedCommitmentTypeId.UNPLEDGE:
            return {
                type: CommitmentTypeId.UNPLEDGE,
                pledgeCountBeforeExecuting: BigInt(enc.pledgeCountBeforeExecuting),
                partitionHash: decodeBase58ToFixed(enc.partitionHash, 32),
            };
        case EncodedCommitmentTypeId.UNSTAKE:
            return { type: CommitmentTypeId.UNSTAKE };
    }
}
export function encodeCommitmentType(type) {
    switch (type.type) {
        case CommitmentTypeId.STAKE:
            return { type: EncodedCommitmentTypeId.STAKE };
        case CommitmentTypeId.PLEDGE:
            return {
                type: EncodedCommitmentTypeId.PLEDGE,
                pledgeCountBeforeExecuting: type.pledgeCountBeforeExecuting.toString(),
            };
        case CommitmentTypeId.UNPLEDGE:
            return {
                type: EncodedCommitmentTypeId.UNPLEDGE,
                pledgeCountBeforeExecuting: type.pledgeCountBeforeExecuting.toString(),
                partitionHash: encodeBase58(type.partitionHash),
            };
        case CommitmentTypeId.UNSTAKE:
            return { type: EncodedCommitmentTypeId.UNSTAKE };
    }
}
// This will get encoded by RLP encode with a length header for PLEDGE and UNPLEDGE
// DO NOT CHANGE THIS UNLESS YOU THOROUGHLY TEST IT & 1:1 IT IN RUST (stricter decoder)
export function signingEncodeCommitmentType(type) {
    // note: values are `encode`ed by the top-level `encode` call (caller's responsibility)
    // single-byte values MUST be flat (check this with the rust decoder, it will error for non-canonical single byte RLP lists)
    // multiple elements MUST be in a regular array
    // ORDERING MATTERS
    switch (type.type) {
        case CommitmentTypeId.STAKE:
            // return typeBuf;
            return type.type;
        case CommitmentTypeId.PLEDGE:
            return [type.type, type.pledgeCountBeforeExecuting];
        case CommitmentTypeId.UNPLEDGE:
            return [type.type, type.pledgeCountBeforeExecuting, type.partitionHash];
        case CommitmentTypeId.UNSTAKE:
            // return typeBuf;
            return type.type;
    }
}
export var CommitmentTransactionVersion;
(function (CommitmentTransactionVersion) {
    // V1 = 1, DEPRECATED DO NOT USE
    CommitmentTransactionVersion[CommitmentTransactionVersion["V2"] = 2] = "V2";
})(CommitmentTransactionVersion || (CommitmentTransactionVersion = {}));
function validateCommitmentVersion(obj) {
    // TODO: once we add more versions (that we want to retain support for in the SDK)
    // update this logic
    if (obj.version && obj.version !== CommitmentTransactionVersion.V2) {
        throw new Error(`Invalid commitment version ${obj.version}, allowable version: ${CommitmentTransactionVersion.V2}`);
    }
}
const encodeBase58Nullish = (v) => {
    if (v === undefined)
        return undefined;
    return encodeBase58(v);
};
export function decodeBase58ToFixedNullish(string, length) {
    if (string === undefined)
        return undefined;
    return decodeBase58ToFixed(string, length);
}
export class UnsignedCommitmentTransaction {
    version = CommitmentTransactionVersion.V2;
    id = undefined;
    anchor = undefined;
    signer = undefined;
    commitmentType = undefined;
    fee = 0n;
    chainId = IRYS_TESTNET_CHAIN_ID;
    signature = undefined;
    value = 0n;
    irys;
    constructor(irys, attributes) {
        // super();
        this.irys = irys;
        if (attributes)
            Object.assign(this, attributes);
        validateCommitmentVersion(this);
    }
    isSigned() {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return JSON.stringify(this.encode());
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    encode() {
        return {
            // id: this.id,
            version: this.version,
            anchor: encodeBase58Nullish(this.anchor),
            signer: encodeBase58Nullish(this.signer),
            fee: this.fee.toString(),
            chainId: this.chainId.toString(),
            // signature: encodeBase58Nullish(this.signature),
            value: this.value.toString(),
            commitmentType: this.commitmentType === undefined
                ? undefined
                : encodeCommitmentType(this.commitmentType),
        };
    }
    static decode(irys, encoded) {
        return new UnsignedCommitmentTransaction(irys, {
            version: encoded.version,
            anchor: decodeBase58ToFixedNullish(encoded.anchor, 32),
            signer: decodeBase58ToFixedNullish(encoded.signer, 20),
            chainId: encoded.chainId === undefined ? undefined : BigInt(encoded.chainId),
            fee: encoded.fee === undefined ? undefined : BigInt(encoded.fee),
            value: encoded.value === undefined ? undefined : BigInt(encoded.value),
            commitmentType: encoded.commitmentType === undefined
                ? undefined
                : decodeCommitmentType(encoded.commitmentType),
        });
    }
    get missingProperties() {
        return requiredUnsignedCommitmentTxHeaderProps.reduce((acc, k) => {
            if (this[k] === undefined)
                acc.push(k);
            return acc;
        }, []);
    }
    async fillFee() {
        const commitmentType = getOrThrowIfNullish(this, "commitmentType", "Unable to get fee for a commitment without {1} set");
        const commitmentPrice = await this.irys.network.getCommitmentPrice(getOrThrowIfNullish(this, "signer"), commitmentType);
        this.fee = commitmentPrice.fee;
        this.value = commitmentPrice.value;
        if (commitmentType.type === CommitmentTypeId.PLEDGE ||
            commitmentType.type === CommitmentTypeId.UNPLEDGE) {
            commitmentType.pledgeCountBeforeExecuting = getOrThrowIfNullish(commitmentPrice, "pledgeCount", "Service error: expected {1} to be set for pledge/unpledge price request");
        }
        return this;
    }
    async fillAnchor() {
        const apiAnchor = await this.irys.network.getAnchor();
        this.anchor = apiAnchor.blockHash;
        return this;
    }
    throwOnMissing() {
        const missing = this.missingProperties;
        if (missing.length)
            throw new Error(`Missing required properties: ${missing.join(", ")}`);
    }
    async sign(key) {
        const signingKey = typeof key === "string"
            ? new SigningKey(key.startsWith("0x") ? key : `0x${key}`) // ethers requires the 0x prefix
            : key;
        const computedSigner = toFixedUint8Array(getBytes(computeAddress(signingKey.publicKey)), 20);
        this.signer ??= computedSigner;
        if (!arrayCompare(computedSigner, this.signer)) {
            throw new Error(`Provided signer address ${encodeBase58(this.signer)} is not equivalent to the address for the provided signing key (${encodeBase58(computedSigner)})`);
        }
        if (!this.anchor)
            await this.fillAnchor();
        if (!this.fee)
            await this.fillFee();
        const prehash = await this.getSignatureData();
        const signature = signingKey.sign(prehash);
        this.signature = toFixedUint8Array(getBytes(signature.serialized), 65);
        if (hexlify(this.signature) !== signature.serialized) {
            throw new Error(`signature encode/decode roundtrip error: ${this.signature} ${signature.serialized}`);
        }
        const idBytes = getBytes(keccak256(this.signature));
        this.id = encodeBase58(toFixedUint8Array(idBytes, 32));
        return new SignedCommitmentTransaction(this.irys, this);
    }
    // / returns the "signature data" aka the prehash (hash of all the tx fields)
    getSignatureData() {
        switch (this.version) {
            case CommitmentTransactionVersion.V2:
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
                    signingEncodeCommitmentType(getOrThrowIfNullish(this, "commitmentType", "Unable to sign commitment tx with missing field {1}")),
                    this.chainId,
                    this.fee,
                    this.value,
                ];
                const encoded = encode(fields);
                const prehash = getBytes(keccak256(encoded));
                return Promise.resolve(prehash);
            default:
                throw new Error(`Unknown transaction version : ${this.version}`);
        }
    }
}
export class SignedCommitmentTransaction {
    version;
    id;
    anchor;
    signer;
    commitmentType;
    fee;
    chainId;
    signature;
    value;
    irys;
    constructor(irys, attributes) {
        // super();
        this.irys = irys;
        // safer than object.assign, given we will be getting passed a class instance
        // this should "copy" over all header properties & chunks
        for (const k of fullSignedCommitmentTxProps) {
            const v = attributes[k];
            if (v === undefined && requiredSignedCommitmentTxHeaderProps.includes(k))
                throw new Error(`Unable to build signed transaction - missing field ${k}`);
            this[k] = v;
        }
        validateCommitmentVersion(this);
    }
    get missingProperties() {
        return requiredSignedCommitmentTxHeaderProps.reduce((acc, k) => {
            if (this[k] === undefined)
                acc.push(k);
            return acc;
        }, []);
    }
    isSigned() {
        return true;
    }
    throwOnMissing() {
        const missing = this.missingProperties;
        if (missing.length)
            throw new Error(`Missing required properties: ${missing.join(", ")}`);
    }
    getHeader() {
        return fullSignedCommitmentTxHeaderProps.reduce((acc, k) => {
            acc[k] =
                this[k];
            return acc;
        }, {});
    }
    // if you want the encoded header without chunks, use `this.encode(false)`
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return JSON.stringify(this.encode());
    }
    get txId() {
        return this.id;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    encode() {
        return {
            id: this.id,
            version: this.version,
            anchor: encodeBase58(this.anchor),
            signer: encodeBase58(this.signer),
            fee: this.fee.toString(),
            chainId: this.chainId.toString(),
            signature: encodeBase58(this.signature),
            value: this.value.toString(),
            commitmentType: encodeCommitmentType(this.commitmentType),
        };
    }
    static decode(irys, encoded) {
        return new SignedCommitmentTransaction(irys, {
            id: encoded.id,
            version: encoded.version,
            anchor: decodeBase58ToFixed(encoded.anchor, 32),
            signer: decodeBase58ToFixed(encoded.signer, 20),
            chainId: BigInt(encoded.chainId),
            signature: decodeBase58ToFixed(encoded.signature, 65),
            fee: BigInt(encoded.fee),
            value: BigInt(encoded.value),
            commitmentType: decodeCommitmentType(encoded.commitmentType),
        });
    }
    async upload(apiConfig) {
        return await this.irys.api.post(V1_API_ROUTES.POST_COMMITMENT_TX_HEADER, this.toJSON(), {
            ...apiConfig,
            headers: { "Content-Type": "application/json" },
            validateStatus: (s) => s < 400,
        });
    }
    // Validate the signature by computing the prehash and recovering the signer's address using the prehash and the signature.
    // compares the recovered signer address to the tx's address, and returns true if they match
    async validateSignature() {
        const prehash = await this.getSignatureData();
        const recoveredAddress = getBytes(recoverAddress(prehash, hexlify(this.signature)));
        return arrayCompare(recoveredAddress, this.signer);
    }
    getSignatureData() {
        // TODO: deduplicate logic
        switch (this.version) {
            case CommitmentTransactionVersion.V2:
                // throw if any of the required fields are missing
                this.throwOnMissing();
                // RLP encoding - field ordering matters!
                const fields = [
                    this.version,
                    this.anchor,
                    this.signer,
                    signingEncodeCommitmentType(getOrThrowIfNullish(this, "commitmentType", "Unable to sign commitment tx with missing field {1}")),
                    this.chainId,
                    this.fee,
                    this.value,
                ];
                const encoded = encode(fields);
                const prehash = getBytes(keccak256(encoded));
                return Promise.resolve(prehash);
            default:
                throw new Error(`Unknown transaction version : ${this.version}`);
        }
    }
}
export function getOrThrowIfNullish(obj, key, msg = "Missing required property {1}") {
    const v = obj[key];
    if (v === undefined || v === null) {
        throw new Error(msg.replace("{1}", key));
    }
    else {
        // this is because NonNullable doesn't perserve the types properly
        return v;
    }
}
//# sourceMappingURL=commitmentTransaction.js.map