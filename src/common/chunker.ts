import { concatBuffers, isAsyncIter } from "./utils";

export class ChunkBuffer {
  readonly buffers: Uint8Array[] = [];

  get empty(): boolean {
    return this.buffers.length === 0;
  }

  push(...buffers: Uint8Array[]): void {
    this.buffers.push(...buffers);
  }

  pop(expectedChunkSize: number): Uint8Array | null {
    let totalBufferSize = 0;

    for (const [i, chunk] of this.buffers.entries()) {
      totalBufferSize += chunk.byteLength;

      if (totalBufferSize === expectedChunkSize) {
        return concatBuffers(this.buffers.splice(0, i + 1));
      } else if (totalBufferSize > expectedChunkSize) {
        const chunkOverflowAmount = totalBufferSize - expectedChunkSize;
        const chunkWatermark = chunk.byteLength - chunkOverflowAmount;
        const chunkBelowWatermark = chunk.slice(0, chunkWatermark);
        const chunkOverflow = chunk.slice(chunkWatermark);

        const chunkBuffers = this.buffers.splice(0, i);
        chunkBuffers.push(chunkBelowWatermark);

        this.buffers[0] = chunkOverflow;
        return concatBuffers(chunkBuffers);
      }
    }

    return null;
  }

  flush(): Uint8Array {
    const remaining = concatBuffers(this.buffers);
    this.buffers.length = 0;
    return remaining;
  }
}

export function chunker(
  chunkSize: number,
  { flush = true }: { flush?: boolean } = {}
) {
  return async function* (
    data: Uint8Array | AsyncIterable<Uint8Array>
  ): AsyncIterable<Uint8Array> {
    const chunkBuffer = new ChunkBuffer();

    if (isAsyncIter(data)) {
      for await (const chunk of data) {
        chunkBuffer.push(chunk);
        yield* yieldCompleteChunks(chunkBuffer, chunkSize);
      }
    } else {
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

async function* yieldCompleteChunks(
  buffer: ChunkBuffer,
  size: number
): AsyncGenerator<Uint8Array> {
  while (true) {
    const chunk = buffer.pop(size);
    if (!chunk) break;
    yield chunk;
  }
}
