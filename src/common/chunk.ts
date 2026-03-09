import { encodeBase58 } from "ethers";
import type {
  Address,
  Base58,
  Base64Url,
  H256,
  PartitionChunkOffset,
  TxRelativeChunkOffset,
  U64,
} from "./dataTypes";
import type { IrysClient } from "./irys";
import { unpackChunk } from "./packing";
import {
  b64UrlToBuffer,
  bigIntDivCeil,
  bufferTob64Url,
  decodeBase58,
  jsonBigIntSerialize,
  toFixedUint8Array,
} from "./utils";

export enum ChunkFormat {
  PackedChunk = "packed",
  UnpackedChunk = "unpacked",
}

export type UnpackedChunkInterface = {
  dataRoot: H256;
  dataSize: U64;
  dataPath: Uint8Array;
  txOffset: TxRelativeChunkOffset;
  bytes: Uint8Array;
};

export type EncodedUnpackedChunkInterface = {
  dataRoot: Base58;
  dataSize: U64;
  dataPath: Base64Url;
  txOffset: TxRelativeChunkOffset;
  bytes: Base64Url;
};

// Computes a chunk's end byte offset
// (this is used for the merkle proof)
export function chunkEndByteOffset(
  txOffset: number,
  dataSize: U64,
  chunkSize: number,
): U64 {
  const bnChunkSize = BigInt(chunkSize);
  const biTxOffset = BigInt(txOffset);
  const lastIndex = bigIntDivCeil(dataSize, bnChunkSize);
  if (biTxOffset === lastIndex - 1n) {
    return dataSize - 1n;
  } else {
    return (biTxOffset + 1n) * bnChunkSize - 1n;
  }
}
export class UnpackedChunk implements UnpackedChunkInterface {
  public dataRoot!: H256; // root hash
  public dataSize!: U64; // total size of the data stored by this data_root in bytes
  public dataPath!: Uint8Array; // raw bytes of the merkle proof that connect the chunk hash to the data root
  public txOffset!: TxRelativeChunkOffset; // 0-based index of the chunk in the transaction
  public bytes!: Uint8Array; // Raw bytes to be stored. should be network constant `chunk_size` unless it's the very last chunk

  constructor(attributes: UnpackedChunkInterface) {
    this.dataRoot = attributes.dataRoot;
    this.dataSize = attributes.dataSize;
    this.dataPath = attributes.dataPath;
    this.txOffset = attributes.txOffset;
    this.bytes = attributes.bytes;
  }

  public byteOffset(chunkSize: number): U64 {
    return chunkEndByteOffset(this.txOffset, this.dataSize, chunkSize);
  }

  public encode(): EncodedUnpackedChunkInterface {
    return {
      dataRoot: encodeBase58(this.dataRoot),
      dataPath: bufferTob64Url(this.dataPath),
      dataSize: this.dataSize,
      txOffset: this.txOffset,
      bytes: bufferTob64Url(this.bytes),
    };
  }

  public static decode(data: EncodedUnpackedChunkInterface): UnpackedChunk {
    return new UnpackedChunk({
      dataRoot: toFixedUint8Array(decodeBase58(data.dataRoot), 32),
      dataPath: b64UrlToBuffer(data.dataPath),
      dataSize: BigInt(data.dataSize),
      txOffset: data.txOffset,
      bytes: b64UrlToBuffer(data.bytes),
    });
  }

  public toJSON(): string {
    return jsonBigIntSerialize(this.encode());
  }
}

export type PackedChunkInterface = UnpackedChunkInterface & {
  packingAddress: Address;
  partitionOffset: PartitionChunkOffset;
  partitionHash: H256;
};

export type EncodedPackedChunkInterface = EncodedUnpackedChunkInterface & {
  packingAddress: Base58;
  partitionOffset: PartitionChunkOffset;
  partitionHash: Base58;
};

export class PackedChunk implements PackedChunkInterface {
  public dataRoot!: H256;
  public dataSize!: bigint;
  public dataPath!: Uint8Array;
  public txOffset!: number;
  public bytes!: Uint8Array;
  public packingAddress!: Address;
  public partitionOffset!: number;
  public partitionHash!: H256;
  public irys: IrysClient;

  constructor(irys: IrysClient, attributes: Partial<PackedChunkInterface>) {
    this.irys = irys;
    if (attributes.dataRoot !== undefined) this.dataRoot = attributes.dataRoot;
    if (attributes.dataSize !== undefined) this.dataSize = attributes.dataSize;
    if (attributes.dataPath !== undefined) this.dataPath = attributes.dataPath;
    if (attributes.txOffset !== undefined) this.txOffset = attributes.txOffset;
    if (attributes.bytes !== undefined) this.bytes = attributes.bytes;
    if (attributes.packingAddress !== undefined)
      this.packingAddress = attributes.packingAddress;
    if (attributes.partitionOffset !== undefined)
      this.partitionOffset = attributes.partitionOffset;
    if (attributes.partitionHash !== undefined)
      this.partitionHash = attributes.partitionHash;
  }

  public encode(): EncodedPackedChunkInterface {
    return {
      dataRoot: encodeBase58(this.dataRoot),
      dataPath: bufferTob64Url(this.dataPath),
      dataSize: this.dataSize,
      txOffset: this.txOffset,
      bytes: bufferTob64Url(this.bytes),
      packingAddress: encodeBase58(this.packingAddress),
      partitionOffset: this.partitionOffset,
      partitionHash: encodeBase58(this.partitionHash),
    };
  }

  public toJSON(): string {
    return jsonBigIntSerialize(this.encode());
  }

  public static decode(
    irys: IrysClient,
    data: EncodedPackedChunkInterface,
  ): PackedChunk {
    return new PackedChunk(irys, {
      dataRoot: toFixedUint8Array(decodeBase58(data.dataRoot), 32),
      dataPath: b64UrlToBuffer(data.dataPath),
      dataSize: BigInt(data.dataSize),
      txOffset: data.txOffset,
      bytes: b64UrlToBuffer(data.bytes),
      packingAddress: toFixedUint8Array(decodeBase58(data.packingAddress), 20),
      partitionOffset: data.partitionOffset,
      partitionHash: toFixedUint8Array(decodeBase58(data.partitionHash), 32),
    });
  }

  public async unpack(): Promise<UnpackedChunk> {
    return unpackChunk(
      this.irys.cryptoDriver,
      this,
      this.irys.storageConfig.chunkSize,
      this.irys.storageConfig.entropyPackingIterations,
      this.irys.chainId,
    );
  }
}
