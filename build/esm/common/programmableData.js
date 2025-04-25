import { hexlify } from "ethers";
import { ByteRangeSpecifier, ChunkRangeSpecifier } from "./rangeSpecifier.js";
import { jsonBigIntSerialize } from "./utils.js";
import { Utils } from "./utilities.js";
export const PD_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000000500";
export class ReadBuilder {
    readRanges;
    irys;
    constructor(irys) {
        this.irys = irys;
        this.readRanges = [];
    }
    // read `length` bytes starting from byte offset `offset` of tx `txId`
    read(txId, offset, length) {
        if (offset < 0 || length <= 0)
            throw new Error("invalid read range");
        this.readRanges.push({ txId, start: offset, length });
        return this;
    }
    async toAccessList() {
        const { chunkRanges, byteRanges } = await this.build();
        const storageKeys = [...chunkRanges, ...byteRanges].map((r) => hexlify(r.encode()));
        return { address: PD_PRECOMPILE_ADDRESS, storageKeys };
    }
    async build() {
        const chunkRanges = [];
        const byteRanges = [];
        const dataStartCache = new Map();
        for (const { txId, start, length } of this.readRanges) {
            // get the data start for this tx from cache, populating if we haven't seen this tx before.
            let dataStart = 0n;
            if (dataStartCache.has(txId)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                dataStart = dataStartCache.get(txId);
            }
            else {
                const txMeta = (await Utils.checkAndThrow(this.irys.storageTransactions.getHeader(txId))).data;
                if (txMeta.ledgerId !== 0)
                    throw new Error(`Transaction ${txId} is not permanent (ledger 0) and cannot be used.`);
                dataStart = await Utils.checkAndThrow(await this.irys.storageTransactions.getLocalDataStartOffset(txId)).then((r) => BigInt(r.data.dataStartOffset));
                dataStartCache.set(txId, dataStart);
            }
            const chunkSize = this.irys.storageConfig.chunkSize;
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
            const index = merged.findIndex((i) => i[0] <= r.absoluteChunkOffset && i[1] >= r.absoluteChunkOffset);
            if (index === -1)
                throw new Error(`Unable to resolve merged chunk range for byte read - please report this!\n ${jsonBigIntSerialize(r)}`);
            return new ByteRangeSpecifier(index, r.chunkOffset, r.byteOffset, r.length);
        });
        const chunkSpecifiers = merged.map((r) => {
            const [start, end] = r;
            const chunksPerPart = BigInt(this.irys.storageConfig.numChunksInPartition);
            // bigint division rounds down
            const partitionIndex = start / chunksPerPart;
            // safety: `numChunksInPartition` should never be higher than 2^53
            const chunks = Number(start % chunksPerPart);
            return new ChunkRangeSpecifier(partitionIndex, chunks, 
            // safety: the chunk range length should never be higher than 2^53
            Number(end - start));
        });
        return { chunkRanges: chunkSpecifiers, byteRanges: indexed };
    }
}
export class ProgrammableData {
    irys;
    constructor(irys) {
        this.irys = irys;
    }
    // create a *new* read builder with this read
    read(txId, offset, length) {
        const rb = new ReadBuilder(this.irys);
        return rb.read(txId, offset, length);
    }
}
function mergeRanges(ranges) {
    if (ranges.length <= 1)
        return ranges;
    const sortedRanges = [...ranges].sort((a, b) => {
        if (a[0] < b[0])
            return -1;
        if (a[0] > b[0])
            return 1;
        if (a[1] < b[1])
            return -1;
        if (a[1] > b[1])
            return 1;
        return 0;
    });
    const merged = [];
    let currentRange = sortedRanges[0];
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
        }
        else {
            // no overlap, add current range and start a new one
            merged.push(currentRange);
            currentRange = sortedRanges[i];
        }
    }
    merged.push(currentRange);
    return merged;
}
//# sourceMappingURL=programmableData.js.map