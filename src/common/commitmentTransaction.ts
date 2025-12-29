/* eslint-disable no-case-declarations */

import type {
  Address,
  Base58,
  FixedUint8Array,
  H256,
  Signature,
  TransactionId,
  U256,
  U64,
  UTF8,
} from "./dataTypes";
import { decodeBase58ToFixed, toFixedUint8Array } from "./utils";
import { arrayCompare } from "./merkle";
import type { Input } from "rlp";
import { encode } from "rlp";
import type { BytesLike } from "ethers";
import { SigningKey } from "ethers";
import {
  computeAddress,
  encodeBase58,
  getBytes,
  hexlify,
  keccak256,
  recoverAddress,
} from "ethers";
import { IRYS_TESTNET_CHAIN_ID } from "./constants";
import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import { V1_API_ROUTES, type ApiRequestConfig } from "./api";
import type { PledgePriceInfo } from "./network";

export type CommitmentTransactionInterface =
  | UnsignedCommitmentTransactionInterface
  | SignedCommitmentTransactionInterface;

export type UnsignedCommitmentTransactionInterface = {
  version: CommitmentTransactionVersion;
  anchor: H256;
  signer: Address;
  commitmentType: CommitmentType;
  chainId: U64;
  fee: U64;
  value: U256;
};

export type SignedCommitmentTransactionInterface =
  UnsignedCommitmentTransactionInterface & {
    id: Base58;
    signature: Signature;
  };

export type EncodedUnsignedCommitmentTransactionInterface = {
  version: CommitmentTransactionVersion;
  anchor: Base58<H256>;
  signer: Base58<Address>;
  chainId: UTF8<U64>;
  fee: UTF8<U64>;
  value: UTF8<U256>;
  commitmentType: EncodedCommitmentType;
};

export type EncodedSignedCommitmentTransactionInterface =
  EncodedUnsignedCommitmentTransactionInterface & {
    id: Base58<H256>;
    signature: Base58<Signature>;
  };

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

export enum CommitmentTypeId {
  STAKE = 1,
  PLEDGE = 2,
  UNPLEDGE = 3,
  UNSTAKE = 4, // unimplemented!
}

export enum EncodedCommitmentTypeId {
  STAKE = "stake",
  PLEDGE = "pledge",
  UNPLEDGE = "unpledge",
  UNSTAKE = "unstake", // unimplemented!
}

export type CommitmentType =
  | {
      type: CommitmentTypeId.STAKE | CommitmentTypeId.UNSTAKE;
    }
  | {
      type: CommitmentTypeId.PLEDGE;
      pledgeCountBeforeExecuting: U64;
    }
  | {
      type: CommitmentTypeId.UNPLEDGE;
      pledgeCountBeforeExecuting: U64;
      partitionHash: H256;
    };

export type EncodedCommitmentType =
  | {
      type: EncodedCommitmentTypeId.STAKE | EncodedCommitmentTypeId.UNSTAKE;
    }
  | {
      type: EncodedCommitmentTypeId.PLEDGE;
      pledgeCountBeforeExecuting: UTF8<U64>;
    }
  | {
      type: EncodedCommitmentTypeId.UNPLEDGE;
      pledgeCountBeforeExecuting: UTF8<U64>;
      partitionHash: Base58<H256>;
    };

function decodeCommitmentType(enc: EncodedCommitmentType): CommitmentType {
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

export function encodeCommitmentType(
  type: CommitmentType
): EncodedCommitmentType {
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
export function signingEncodeCommitmentType(
  type: CommitmentType
): number | bigint | Uint8Array | (number | bigint | Uint8Array)[] {
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

export enum CommitmentTransactionVersion {
  // V1 = 1, DEPRECATED DO NOT USE
  V2 = 2,
}

function validateCommitmentVersion(
  obj: Partial<UnsignedCommitmentTransactionInterface>
): undefined {
  // TODO: once we add more versions (that we want to retain support for in the SDK)
  // update this logic
  if (obj.version && obj.version !== CommitmentTransactionVersion.V2) {
    throw new Error(
      `Invalid commitment version ${obj.version}, allowable version: ${CommitmentTransactionVersion.V2}`
    );
  }
}

const encodeBase58Nullish = (v: BytesLike | undefined): string | undefined => {
  if (v === undefined) return undefined;
  return encodeBase58(v);
};

export function decodeBase58ToFixedNullish<N extends number>(
  string: Base58 | undefined,
  length: N
): FixedUint8Array<N> | undefined {
  if (string === undefined) return undefined;
  return decodeBase58ToFixed<N>(string, length);
}

export class UnsignedCommitmentTransaction
  implements Partial<UnsignedCommitmentTransactionInterface>
{
  public version: CommitmentTransactionVersion =
    CommitmentTransactionVersion.V2;
  public id?: TransactionId = undefined;
  public anchor?: H256 = undefined;
  public signer?: Address = undefined;
  public commitmentType?: CommitmentType = undefined;
  public fee: U64 = 0n;
  public chainId: U64 = IRYS_TESTNET_CHAIN_ID;
  public signature?: Signature = undefined;
  public value: U256 = 0n;
  public irys!: IrysClient;

  public constructor(
    irys: IrysClient,
    attributes?: Partial<UnsignedCommitmentTransactionInterface>
  ) {
    // super();
    this.irys = irys;
    if (attributes) Object.assign(this, attributes);
    validateCommitmentVersion(this);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public toJSON(): string {
    return JSON.stringify(this.encode());
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public encode(): Partial<EncodedUnsignedCommitmentTransactionInterface> {
    return {
      // id: this.id,
      version: this.version,
      anchor: encodeBase58Nullish(this.anchor),
      signer: encodeBase58Nullish(this.signer),
      fee: this.fee.toString(),
      chainId: this.chainId.toString(),
      // signature: encodeBase58Nullish(this.signature),
      value: this.value.toString(),
      commitmentType:
        this.commitmentType === undefined
          ? undefined
          : encodeCommitmentType(this.commitmentType),
    };
  }

  public static decode(
    irys: IrysClient,
    encoded: Partial<EncodedUnsignedCommitmentTransactionInterface>
  ): UnsignedCommitmentTransaction {
    return new UnsignedCommitmentTransaction(irys, {
      version: encoded.version,
      anchor: decodeBase58ToFixedNullish(encoded.anchor, 32),
      signer: decodeBase58ToFixedNullish(encoded.signer, 20),
      chainId:
        encoded.chainId === undefined ? undefined : BigInt(encoded.chainId),
      fee: encoded.fee === undefined ? undefined : BigInt(encoded.fee),
      value: encoded.value === undefined ? undefined : BigInt(encoded.value),
      commitmentType:
        encoded.commitmentType === undefined
          ? undefined
          : decodeCommitmentType(encoded.commitmentType),
    });
  }

  get missingProperties(): string[] {
    return requiredUnsignedCommitmentTxHeaderProps.reduce<string[]>(
      (acc, k) => {
        if (this[k as keyof this] === undefined) acc.push(k);
        return acc;
      },
      []
    );
  }

  public async fillFee(): Promise<this> {
    const commitmentType = getOrThrowIfNullish(
      this,
      "commitmentType",
      "Unable to get fee for a commitment without {1} set"
    );
    const commitmentPrice = await this.irys.network.getCommitmentPrice(
      getOrThrowIfNullish(this, "signer"),
      commitmentType
    );
    this.fee = commitmentPrice.fee;
    this.value = commitmentPrice.value;
    if (
      commitmentType.type === CommitmentTypeId.PLEDGE ||
      commitmentType.type === CommitmentTypeId.UNPLEDGE
    ) {
      commitmentType.pledgeCountBeforeExecuting = getOrThrowIfNullish(
        commitmentPrice as PledgePriceInfo,
        "pledgeCount",
        "Service error: expected {1} to be set for pledge/unpledge price request"
      );
    }
    return this;
  }

  public async fillAnchor(): Promise<this> {
    const apiAnchor = await this.irys.network.getAnchor();
    this.anchor = apiAnchor.blockHash;
    return this;
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(
        `Missing required properties: ${missing.join(
          ", "
        )} - did you call tx.prepareChunks(<data>)?`
      );
  }

  public async sign(
    key: SigningKey | string
  ): Promise<SignedCommitmentTransaction> {
    const signingKey =
      typeof key === "string"
        ? new SigningKey(key.startsWith("0x") ? key : `0x${key}`) // ethers requires the 0x prefix
        : key;

    this.signer ??= toFixedUint8Array(
      getBytes(computeAddress(signingKey.publicKey)),
      20
    );

    if (!this.anchor) await this.fillAnchor();
    if (!this.fee) await this.fillFee();

    const prehash = await this.getSignatureData();

    const signature = signingKey.sign(prehash);
    this.signature = toFixedUint8Array(getBytes(signature.serialized), 65);
    if (hexlify(this.signature) !== signature.serialized) {
      throw new Error();
    }

    const idBytes = getBytes(keccak256(this.signature));
    this.id = encodeBase58(toFixedUint8Array(idBytes, 32));

    return new SignedCommitmentTransaction(
      this.irys,
      this as any as SignedCommitmentTransactionInterface
    );
  }

  // / returns the "signature data" aka the prehash (hash of all the tx fields)
  public getSignatureData(): Promise<Uint8Array> {
    switch (this.version) {
      case CommitmentTransactionVersion.V2:
        // throw if any of the required fields are missing
        this.throwOnMissing();
        // RLP encoding - field ordering matters!
        // BE VERY CAREFUL ABOUT HOW WE SERIALIZE AND DESERIALIZE
        // note: `undefined`/nullish and 0 serialize to the same thing
        // this is notable for `bundleFormat` and `permFee`
        const fields: Input = [
          this.version,
          this.anchor,
          this.signer,
          signingEncodeCommitmentType(
            getOrThrowIfNullish(
              this,
              "commitmentType",
              "Unable to sign commitment tx with missing field {1}"
            )
          ),
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

export class SignedCommitmentTransaction
  implements SignedCommitmentTransactionInterface
{
  public version!: CommitmentTransactionVersion;
  public id!: TransactionId;
  public anchor!: H256;
  public signer!: Address;
  public commitmentType!: CommitmentType;
  public fee!: U64;
  public chainId!: U64;
  public signature!: Signature;
  public value!: U256;
  public irys!: IrysClient;

  public constructor(
    irys: IrysClient,
    attributes: SignedCommitmentTransactionInterface
  ) {
    // super();
    this.irys = irys;
    // safer than object.assign, given we will be getting passed a class instance
    // this should "copy" over all header properties & chunks
    for (const k of fullSignedCommitmentTxProps) {
      const v = attributes[k as keyof SignedCommitmentTransactionInterface];
      if (v === undefined && requiredSignedCommitmentTxHeaderProps.includes(k))
        throw new Error(
          `Unable to build signed transaction - missing field ${k}`
        );
      this[k as keyof this] = v as any;
    }
    validateCommitmentVersion(this);
  }

  get missingProperties(): string[] {
    return requiredSignedCommitmentTxHeaderProps.reduce<string[]>((acc, k) => {
      if (this[k as keyof this] === undefined) acc.push(k);
      return acc;
    }, []);
  }

  throwOnMissing(): void {
    const missing = this.missingProperties;
    if (missing.length)
      throw new Error(`Missing required properties: ${missing.join(", ")}`);
  }

  public getHeader(): SignedCommitmentTransactionInterface {
    return fullSignedCommitmentTxHeaderProps.reduce<Record<string, any>>(
      (acc, k) => {
        acc[k as keyof SignedCommitmentTransactionInterface] =
          this[k as keyof this];
        return acc;
      },
      {}
    ) as SignedCommitmentTransactionInterface;
  }

  // if you want the encoded header without chunks, use `this.encode(false)`
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public toJSON(): string {
    return JSON.stringify(this.encode());
  }

  get txId(): string {
    return this.id;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public encode(): EncodedSignedCommitmentTransactionInterface {
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

  public static decode(
    irys: IrysClient,
    encoded: EncodedSignedCommitmentTransactionInterface
  ): SignedCommitmentTransaction {
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

  public async upload(apiConfig?: ApiRequestConfig): Promise<AxiosResponse> {
    return await this.irys.api.post(
      V1_API_ROUTES.POST_COMMITMENT_TX_HEADER,
      this.toJSON(),
      {
        ...apiConfig,
        headers: { "Content-Type": "application/json" },
        validateStatus: (s) => s < 400,
      }
    );
  }

  // Validate the signature by computing the prehash and recovering the signer's address using the prehash and the signature.
  // compares the recovered signer address to the tx's address, and returns true if they match
  public async validateSignature(): Promise<boolean> {
    const prehash = await this.getSignatureData();
    const recoveredAddress = getBytes(
      recoverAddress(prehash, hexlify(this.signature))
    );
    return arrayCompare(recoveredAddress, this.signer);
  }

  public getSignatureData(): Promise<Uint8Array> {
    // TODO: deduplicate logic
    switch (this.version) {
      case CommitmentTransactionVersion.V2:
        // throw if any of the required fields are missing
        this.throwOnMissing();
        // RLP encoding - field ordering matters!
        const fields: Input = [
          this.version,
          this.anchor,
          this.signer,
          signingEncodeCommitmentType(
            getOrThrowIfNullish(
              this,
              "commitmentType",
              "Unable to sign commitment tx with missing field {1}"
            )
          ),
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

export function getOrThrowIfNullish<T, K extends keyof T & string>(
  obj: T,
  key: K,
  msg = "Missing required property {1}"
): Exclude<T[K], undefined | null> {
  const v = obj[key];
  if (v === undefined || v === null) {
    throw new Error(msg.replace("{1}", key));
  } else {
    // this is because NonNullable doesn't perserve the types properly
    return v as Exclude<T[K], undefined | null>;
  }
}
