import { encodeBase58 } from "ethers";
import type {
  Address,
  Base64Url,
  H256,
  PartitionChunkOffset,
  TxRelativeChunkOffset,
  u64,
} from "./dataTypes";

export enum ChunkFormat {
  PackedChunk = "packed",
  UnpackedChunk = "unpacked",
}

export type UnpackedChunkInterface = {
  dataRoot: H256;
  dataSize: u64;
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

export class UnpackedChunk implements UnpackedChunkInterface {
  public dataRoot!: H256;
  public dataSize!: u64;
  public dataPath!: Base64Url;
  public txOffset!: TxRelativeChunkOffset;
  public bytes!: Base64Url;

  constructor(attributes: UnpackedChunkInterface) {
    for (const k of unpackedChunkProperties) {
      this[k as keyof this] = attributes[
        k as keyof UnpackedChunkInterface
      ] as any;
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get chunk() {
    return {
      data_root: encodeBase58(this.dataRoot),
      data_path: this.dataPath,
      data_size: this.dataSize,
      tx_offset: this.txOffset,
      bytes: this.bytes,
    };
  }

  public serialize(): string {
    return JSON.stringify(this.chunk, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    );
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
