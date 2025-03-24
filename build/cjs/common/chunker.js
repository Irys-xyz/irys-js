"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunker = exports.ChunkBuffer = void 0;
const utils_1 = require("./utils");
class ChunkBuffer {
    constructor() {
        this.buffers = [];
    }
    get empty() {
        return this.buffers.length === 0;
    }
    push(...buffers) {
        this.buffers.push(...buffers);
    }
    pop(expectedChunkSize) {
        let totalBufferSize = 0;
        for (const [i, chunk] of this.buffers.entries()) {
            totalBufferSize += chunk.byteLength;
            if (totalBufferSize === expectedChunkSize) {
                return (0, utils_1.concatBuffers)(this.buffers.splice(0, i + 1));
            }
            else if (totalBufferSize > expectedChunkSize) {
                const chunkOverflowAmount = totalBufferSize - expectedChunkSize;
                const chunkWatermark = chunk.byteLength - chunkOverflowAmount;
                const chunkBelowWatermark = chunk.slice(0, chunkWatermark);
                const chunkOverflow = chunk.slice(chunkWatermark);
                const chunkBuffers = this.buffers.splice(0, i);
                chunkBuffers.push(chunkBelowWatermark);
                this.buffers[0] = chunkOverflow;
                return (0, utils_1.concatBuffers)(chunkBuffers);
            }
        }
        return null;
    }
    flush() {
        const remaining = (0, utils_1.concatBuffers)(this.buffers);
        this.buffers.length = 0;
        return remaining;
    }
}
exports.ChunkBuffer = ChunkBuffer;
function chunker(chunkSize, { flush = true } = {}) {
    return async function* (data) {
        const chunkBuffer = new ChunkBuffer();
        if ((0, utils_1.isAsyncIter)(data)) {
            for await (const chunk of data) {
                chunkBuffer.push(chunk);
                yield* yieldCompleteChunks(chunkBuffer, chunkSize);
            }
        }
        else {
            chunkBuffer.push(data);
        }
        yield* yieldCompleteChunks(chunkBuffer, chunkSize);
        if (flush) {
            const flushedBuffer = chunkBuffer.flush();
            if (flushedBuffer.byteLength > 0) {
                yield flushedBuffer;
            }
        }
    };
}
exports.chunker = chunker;
async function* yieldCompleteChunks(buffer, size) {
    while (true) {
        const chunk = buffer.pop(size);
        if (!chunk)
            break;
        yield chunk;
    }
}
//# sourceMappingURL=chunker.js.map