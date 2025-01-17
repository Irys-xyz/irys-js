export enum PdAccessListArgsTypeId {
  ChunksRead = 0,
  BytesRead = 1,
}

abstract class PdAccessListArgBase {
  abstract get typeId(): PdAccessListArgsTypeId;

  encode(): Uint8Array {
    const result = new Uint8Array(32);
    result[0] = this.typeId;
    this.encodeInner(result);
    return result;
  }

  protected abstract encodeInner(target: Uint8Array): void;

  protected static validateBigInt(
    value: bigint,
    max: bigint,
    name: string
  ): void {
    if (value < 0n || value > max) {
      throw new Error(`${name} must be between 0 and ${max}`);
    }
  }
}

export class RangeSpecifier extends PdAccessListArgBase {
  static readonly U200_MAX = BigInt(2 ** 200) - 1n;

  constructor(
    public partitionIndex: bigint,
    public offset: number,
    public chunkCount: number
  ) {
    super();
    RangeSpecifier.validateBigInt(
      partitionIndex,
      RangeSpecifier.U200_MAX,
      "partitionIndex"
    );
    if (offset < 0 || offset > 0xffffffff)
      throw new Error("offset must be a valid u32");
    if (chunkCount < 0 || chunkCount > 0xffff)
      throw new Error("chunkCount must be a valid u16");
  }

  get typeId(): PdAccessListArgsTypeId {
    return PdAccessListArgsTypeId.ChunksRead;
  }

  protected encodeInner(target: Uint8Array): void {
    // Convert bigint to bytes (25 bytes for U200)
    let tempValue = this.partitionIndex;
    for (let i = 0; i < 25; i++) {
      target[i + 1] = Number(tempValue & 0xffn);
      tempValue >>= 8n;
    }

    // Encode offset (4 bytes)
    const view = new DataView(target.buffer);
    view.setUint32(26, this.offset, true);

    // Encode chunk count (2 bytes)
    view.setUint16(30, this.chunkCount, true);
  }

  static decode(bytes: Uint8Array): RangeSpecifier {
    if (bytes.length !== 32 || bytes[0] !== PdAccessListArgsTypeId.ChunksRead) {
      throw new Error("Invalid byte array for RangeSpecifier");
    }

    // Read partition index (25 bytes)
    let partitionIndex = 0n;
    for (let i = 24; i >= 0; i--) {
      partitionIndex = (partitionIndex << 8n) | BigInt(bytes[i + 1]);
    }

    const view = new DataView(bytes.buffer);
    const offset = view.getUint32(26, true);
    const chunkCount = view.getUint16(30, true);

    return new RangeSpecifier(partitionIndex, offset, chunkCount);
  }
}

export class BytesRangeSpecifier extends PdAccessListArgBase {
  static readonly U18_MAX = BigInt(2 ** 18) - 1n;
  static readonly U34_MAX = BigInt(2 ** 34) - 1n;

  constructor(
    public index: number,
    public chunkOffset: number,
    public byteOffset: bigint,
    public len: bigint
  ) {
    super();
    if (index < 0 || index > 255) throw new Error("index must be a valid u8");
    if (chunkOffset < 0 || chunkOffset > 0xffff)
      throw new Error("chunkOffset must be a valid u16");
    BytesRangeSpecifier.validateBigInt(
      byteOffset,
      BytesRangeSpecifier.U18_MAX,
      "byteOffset"
    );
    BytesRangeSpecifier.validateBigInt(len, BytesRangeSpecifier.U34_MAX, "len");
  }

  get typeId(): PdAccessListArgsTypeId {
    return PdAccessListArgsTypeId.BytesRead;
  }

  protected encodeInner(target: Uint8Array): void {
    target[1] = this.index;

    // Encode chunk offset (2 bytes)
    const view = new DataView(target.buffer);
    view.setUint16(2, this.chunkOffset, true);

    // Encode byte offset (3 bytes for U18)
    let tempByteOffset = this.byteOffset;
    for (let i = 0; i < 3; i++) {
      target[i + 4] = Number(tempByteOffset & 0xffn);
      tempByteOffset >>= 8n;
    }

    // Encode length (5 bytes for U34)
    let tempLen = this.len;
    for (let i = 0; i < 5; i++) {
      target[i + 7] = Number(tempLen & 0xffn);
      tempLen >>= 8n;
    }
  }

  static decode(bytes: Uint8Array): BytesRangeSpecifier {
    if (bytes.length !== 32 || bytes[0] !== PdAccessListArgsTypeId.BytesRead) {
      throw new Error("Invalid byte array for BytesRangeSpecifier");
    }

    const index = bytes[1];
    const chunkOffset = new DataView(bytes.buffer).getUint16(2, true);

    // Read byte offset (3 bytes)
    let byteOffset = 0n;
    for (let i = 2; i >= 0; i--) {
      byteOffset = (byteOffset << 8n) | BigInt(bytes[i + 4]);
    }

    // Read length (5 bytes)
    let len = 0n;
    for (let i = 4; i >= 0; i--) {
      len = (len << 8n) | BigInt(bytes[i + 7]);
    }

    return new BytesRangeSpecifier(index, chunkOffset, byteOffset, len);
  }
}

function tests(): void {
  const rangeSpec = new RangeSpecifier(42n, 12, 11);
  const rangeEncoded = rangeSpec.encode();
  const rangeDecoded = RangeSpecifier.decode(rangeEncoded);

  console.assert(
    rangeDecoded.partitionIndex === rangeSpec.partitionIndex &&
      rangeDecoded.offset === rangeSpec.offset &&
      rangeDecoded.chunkCount === rangeSpec.chunkCount,
    "RangeSpecifier encode/decode roundtrip failed"
  );

  const bytesSpec = new BytesRangeSpecifier(42, 12345, 123456n, 12345678n);
  const bytesEncoded = bytesSpec.encode();
  const bytesDecoded = BytesRangeSpecifier.decode(bytesEncoded);

  console.assert(
    bytesDecoded.index === bytesSpec.index &&
      bytesDecoded.chunkOffset === bytesSpec.chunkOffset &&
      bytesDecoded.byteOffset === bytesSpec.byteOffset &&
      bytesDecoded.len === bytesSpec.len,
    "BytesRangeSpecifier encode/decode roundtrip failed"
  );
}
