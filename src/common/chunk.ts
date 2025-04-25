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
import {
  b64UrlToBuffer,
  bigIntDivCeil,
  bufferTob64Url,
  decodeBase58,
  jsonBigIntSerialize,
  toFixedUint8Array,
} from "./utils";
import type { IrysClient } from "./irys";
import { unpackChunk } from "./packing";
import { IRYS_TESTNET_CHAIN_ID } from "./constants";

export enum ChunkFormat {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PackedChunk = "packed",
  // eslint-disable-next-line @typescript-eslint/naming-convention
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

const unpackedChunkProperties = [
  "dataRoot",
  "dataSize",
  "dataPath",
  "txOffset",
  "bytes",
];

// Computes a chunk's end byte offset
// (this is used for the merkle proof)
export function chunkEndByteOffset(
  txOffset: number,
  dataSize: U64,
  chunkSize: number
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
    for (const k of unpackedChunkProperties) {
      this[k as keyof this] = attributes[
        k as keyof UnpackedChunkInterface
      ] as any;
    }
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

  // eslint-disable-next-line @typescript-eslint/naming-convention
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const packedChunkProperties = [
  ...unpackedChunkProperties,
  "packingAddress",
  "partitionOffset",
  "partitionHash",
];

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
    Object.assign(this, attributes);
    this.irys = irys;
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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public toJSON(): string {
    return jsonBigIntSerialize(this.encode());
  }

  public static decode(
    irys: IrysClient,
    data: EncodedPackedChunkInterface
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
      this,
      this.irys.storageConfig.chunkSize,
      this.irys.storageConfig.entropyPackingIterations,
      IRYS_TESTNET_CHAIN_ID
    );
  }
}
