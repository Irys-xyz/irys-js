import { encodeBase58 } from "ethers";
import type {
  Address,
  Base64Url,
  H256,
  PartitionChunkOffset,
  TxRelativeChunkOffset,
  U64,
} from "./dataTypes";
import { bigIntDivCeil, jsonBigIntSerialize } from "./utils";

export enum ChunkFormat {
  PackedChunk = "packed",
  UnpackedChunk = "unpacked",
}

export type UnpackedChunkInterface = {
  dataRoot: H256;
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
  public dataPath!: Base64Url; // raw bytes of the merkle proof that connect the chunk hash to the data root
  public txOffset!: TxRelativeChunkOffset; // 0-based index of the chunk in the transaction
  public bytes!: Base64Url; // Raw bytes to be stored. should be network constant `chunk_size` unless it's the very last chunk

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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get chunk() {
    return {
      dataRoot: encodeBase58(this.dataRoot),
      dataPath: this.dataPath,
      dataSize: this.dataSize,
      txOffset: this.txOffset,
      bytes: this.bytes,
    };
  }

  public serialize(): string {
    return jsonBigIntSerialize(this.chunk);
  }
}

export type PackedChunkInterface = UnpackedChunkInterface & {
  packingAddress: Address;
  partitionOffset: PartitionChunkOffset;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const packedChunkProperties = [
  ...unpackedChunkProperties,
  "packingAddress",
  "partitionOffset",
];
// TODO: implement
export class PackedChunk implements PackedChunkInterface {
  public dataRoot!: H256;
  public dataSize!: bigint;
  public dataPath!: string;
  public txOffset!: number;
  public bytes!: string;
  public packingAddress!: Address;
  public partitionOffset!: number;

  constructor(attributes: Partial<PackedChunkInterface>) {
    Object.assign(this, attributes);
  }
  // public async unpack(<unpack interface>)
}
