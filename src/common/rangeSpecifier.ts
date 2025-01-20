// Range offsets are used by PD to figure out what chunks/bytes are required to fulfill a precompile call.
import type { U16, U18, U200, U32, U34, U8 } from "./dataTypes";
import { bigIntToBytes, bytesToBigInt } from "./utils";

enum PdAccessListArgsTypeId {
  ChunkRead = 0,
  ByteRead = 1,
}

class PdAccessListArgsTypeIdDecodeError extends Error {
  constructor(id: number) {
    super(`Unknown reserved PD access list args type ID: ${id}`);
    this.name = "PdAccessListArgsTypeIdDecodeError";
  }
}

function tryFromU8(id: number): PdAccessListArgsTypeId {
  switch (id) {
    case 0:
      return PdAccessListArgsTypeId.ChunkRead;
    case 1:
      return PdAccessListArgsTypeId.ByteRead;
    default:
      throw new PdAccessListArgsTypeIdDecodeError(id);
  }
}

export abstract class PdAccessListArgBase {
  abstract get type(): PdAccessListArgsTypeId;
  abstract encode(): Uint8Array;
  static decode(buffer: Uint8Array): PdAccessListArgBase {
    const typeId = tryFromU8(buffer[0]);
    switch (typeId) {
      case PdAccessListArgsTypeId.ChunkRead:
        return ChunkRangeSpecifier.decode(buffer);
      case PdAccessListArgsTypeId.ByteRead:
        return ByteRangeSpecifier.decode(buffer);
      default:
        throw new Error("Unknown PD access list args type");
    }
  }
}

export class ChunkRangeSpecifier extends PdAccessListArgBase {
  constructor(
    public partitionIndex: U200,
    public offset: U32,
    public chunkCount: U16
  ) {
    super();

    if (offset < 0 || offset > 0xffffffff)
      throw new Error("Invalid offset value");

    if (chunkCount < 0 || chunkCount > 0xffff)
      throw new Error("Invalid chunk count value");

    if (partitionIndex < 0 || partitionIndex > 2n ** 200n - 1n)
      throw new Error("Invalid partitionIndex value");
  }

  get type(): PdAccessListArgsTypeId {
    return PdAccessListArgsTypeId.ChunkRead;
  }

  encode(): Uint8Array {
    const buffer = new Uint8Array(32);

    buffer[0] = this.type;

    const partitionBytes = bigIntToBytes(this.partitionIndex, 25);
    buffer.set(partitionBytes, 1);

    const offsetView = new DataView(buffer.buffer, 26, 4);
    offsetView.setUint32(0, this.offset, true);

    const chunkCountView = new DataView(buffer.buffer, 30, 2);
    chunkCountView.setUint16(0, this.chunkCount, true);

    return buffer;
  }

  static decode(buffer: Uint8Array): ChunkRangeSpecifier {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (buffer[0] !== PdAccessListArgsTypeId.ChunkRead) {
      throw new Error("Invalid type ID for ChunkRangeSpecifier");
    }

    const partitionIndex = bytesToBigInt(buffer.slice(1, 26));

    const offsetView = new DataView(buffer.buffer, 26, 4);
    const offset = offsetView.getUint32(0, true);

    const chunkCountView = new DataView(buffer.buffer, 30, 2);
    const chunkCount = chunkCountView.getUint16(0, true);

    return new ChunkRangeSpecifier(partitionIndex, offset, chunkCount);
  }
}

export class ByteRangeSpecifier extends PdAccessListArgBase {
  constructor(
    public index: U8,
    public chunkOffset: U16,
    public byteOffset: U18,
    public length: U34
  ) {
    super();

    if (index < 0 || index > 0xff) {
      throw new Error("Invalid index value");
    }
    if (chunkOffset < 0 || chunkOffset > 0xffff) {
      throw new Error("Invalid chunk offset value");
    }
    if (byteOffset < 0 || byteOffset > 0x3ffff) {
      // max U18 (2^18 - 1)
      throw new Error("Invalid byte offset value");
    }
    if (length < 0 || length > 0x3ffffffff) {
      // max U34 (2^34 - 1)
      throw new Error("Invalid length value");
    }
  }

  get type(): PdAccessListArgsTypeId {
    return PdAccessListArgsTypeId.ByteRead;
  }

  encode(): Uint8Array {
    const buffer = new Uint8Array(32);

    buffer[0] = this.type;

    buffer[1] = this.index;

    // Chunk offset
    const chunkOffsetView = new DataView(buffer.buffer, 2, 2);
    chunkOffsetView.setUint16(0, this.chunkOffset, true);

    // Byte offset (3 bytes)
    const byteOffsetBig = BigInt(this.byteOffset);
    buffer.set(bigIntToBytes(byteOffsetBig, 3), 4);

    // Length (5 bytes)
    const lengthBig = BigInt(this.length);
    buffer.set(bigIntToBytes(lengthBig, 5), 7);

    return buffer;
  }

  static decode(buffer: Uint8Array): ByteRangeSpecifier {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (buffer[0] !== PdAccessListArgsTypeId.ByteRead) {
      throw new Error("Invalid type ID for ByteRangeSpecifier");
    }

    const index = buffer[1];

    const chunkOffsetView = new DataView(buffer.buffer, 2, 2);
    const chunkOffset = chunkOffsetView.getUint16(0, true);

    // Read byte offset (3 bytes)
    const byteOffset = Number(bytesToBigInt(buffer.slice(4, 7)));

    // Read length (5 bytes)
    const length = Number(bytesToBigInt(buffer.slice(7, 12)));

    return new ByteRangeSpecifier(index, chunkOffset, byteOffset, length);
  }

  translateOffset(chunkSize: number, offset: number): ByteRangeSpecifier {
    const fullOffset = offset + this.byteOffset;

    if (fullOffset < 0) {
      throw new Error("Negative offset");
    }

    const additionalChunks = Math.floor(fullOffset / chunkSize);
    const newChunkOffset = this.chunkOffset + additionalChunks;

    if (newChunkOffset > 0xffff) {
      throw new Error("Chunk offset overflow");
    }

    const newByteOffset = fullOffset % chunkSize;

    if (newByteOffset > 0x3ffff) {
      throw new Error("Byte offset overflow");
    }

    return new ByteRangeSpecifier(
      this.index,
      newChunkOffset,
      newByteOffset,
      this.length
    );
  }
}
