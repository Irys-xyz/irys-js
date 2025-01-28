import { hexlify } from "ethers";
import type Api from "./api";
import type { Base58, U8 } from "./dataTypes";
import { ByteRangeSpecifier, ChunkRangeSpecifier } from "./rangeSpecifier";
import type { StorageConfig } from "./storageConfig";
import { jsonSerialize } from "./utils";

export const PD_PRECOMPILE_ADDRESS =
  "0x0000000000000000000000000000000000000500";

export class ReadBuilder {
  protected readRanges: { txId: string; start: U8; length: U8 }[];
  public api: Api;
  public storageConfig: StorageConfig;

  constructor({
    api,
    storageConfig,
  }: {
    api: Api;
    storageConfig: StorageConfig;
  }) {
    this.api = api;
    this.storageConfig = storageConfig;
    this.readRanges = [];
  }

  // read `length` bytes starting from byte offset `offset` of tx `txId`
  public read(txId: Base58, offset: U8, length: U8): this {
    if (offset < 0 || length <= 0) throw new Error("invalid read range");
    this.readRanges.push({ txId, start: offset, length });
    return this;
  }

  public async toAccessList(): Promise<{
    address: string;
    storageKeys: string[];
  }> {
    const { chunkRanges, byteRanges } = await this.build();
    const storageKeys = [...chunkRanges, ...byteRanges].map((r) =>
      hexlify(r.encode())
    );
    return { address: PD_PRECOMPILE_ADDRESS, storageKeys };
  }

  public async build(): Promise<{
    chunkRanges: ChunkRangeSpecifier[];
    byteRanges: ByteRangeSpecifier[];
  }> {
    const chunkRanges: ChunkRange[] = [];
    const byteRanges = [];
    const dataStartCache = new Map<string, bigint>();

    for (const { txId, start, length } of this.readRanges) {
      // get the data start for this tx from cache, populating if we haven't seen this tx before.
      const dataStart =
        dataStartCache.get(txId) ??
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        dataStartCache
          .set(
            txId,
            await this.api
              .get(`/tx/${txId}/local/data_start_offset`)
              .then((r) => {
                if (r.status !== 200)
                  throw new Error(
                    "Unable to find tx - do you need to wait for promotion?"
                  );
                return BigInt(r.data.dataStartOffset as string);
              })
          )
          .get(txId)!;

      const chunkSize = this.storageConfig.chunkSize;
      const startChunkOffset = Math.floor(start / chunkSize);
      const chunkRelativeByteOffset = start % chunkSize;
      // ceil here so we account for the chunk we read into with the byte offset
      const endChunkOffset = startChunkOffset + Math.ceil(length / chunkSize);
      const fullStart = dataStart + BigInt(startChunkOffset);
      // first pass - we then merge the chunk ranges and then assign chunk read range indexes
      byteRanges.push({
        absoluteChunkOffset: fullStart,
        chunkOffset: startChunkOffset,
        byteOffset: chunkRelativeByteOffset,
        length: length,
      });
      chunkRanges.push([fullStart, fullStart + BigInt(endChunkOffset)]);
    }
    const merged = mergeRanges(chunkRanges);

    const indexed = byteRanges.map((r) => {
      const index = merged.findIndex(
        (i) => i[0] <= r.absoluteChunkOffset && i[1] >= r.absoluteChunkOffset
      );
      if (index === -1)
        throw new Error(
          `Unable to resolve merged chunk range for byte read - please report this!\n ${jsonSerialize(
            r
          )}`
        );
      return new ByteRangeSpecifier(
        index,
        r.chunkOffset,
        r.byteOffset,
        r.length
      );
    });
    const chunkSpecifiers = merged.map((r) => {
      const [start, end] = r;
      const chunksPerPart = BigInt(this.storageConfig.numChunksInPartition);
      // bigint division rounds down
      const partitionIndex = start / chunksPerPart;
      // safety: `numChunksInPartition` should never be higher than 2^53
      const chunks = Number(start % chunksPerPart);
      return new ChunkRangeSpecifier(
        partitionIndex,
        chunks,
        // safety: the chunk range length should never be higher than 2^53
        Number(end - start)
      );
    });

    return { chunkRanges: chunkSpecifiers, byteRanges: indexed };
  }
}
export class ProgrammableData {
  public api: Api;
  public storageConfig: StorageConfig;

  constructor({
    api,
    storageConfig,
  }: {
    api: Api;
    storageConfig: StorageConfig;
  }) {
    this.api = api;
    this.storageConfig = storageConfig;
  }

  // create a *new* read builder with this read
  public read(txId: Base58, offset: U8, length: U8): ReadBuilder {
    const rb = new ReadBuilder({
      api: this.api,
      storageConfig: this.storageConfig,
    });
    return rb.read(txId, offset, length);
  }
}

type ChunkRange = [bigint, bigint];

function mergeRanges(ranges: ChunkRange[]): ChunkRange[] {
  if (ranges.length <= 1) return ranges;

  const sortedRanges = [...ranges].sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
  });

  const merged: ChunkRange[] = [];
  let currentRange: ChunkRange = sortedRanges[0];

  for (let i = 1; i < sortedRanges.length; i++) {
    const [currentStart, currentEnd] = currentRange;
    const [nextStart, nextEnd] = sortedRanges[i];

    // check if ranges overlap or are adjacent
    if (nextStart <= currentEnd + 1n) {
      // merge ranges by taking the later end value
      currentRange = [
        currentStart,
        currentEnd > nextEnd ? currentEnd : nextEnd,
      ];
    } else {
      // no overlap, add current range and start a new one
      merged.push(currentRange);
      currentRange = sortedRanges[i];
    }
  }

  merged.push(currentRange);

  return merged;
}
