export declare class ChunkBuffer {
    readonly buffers: Uint8Array[];
    get empty(): boolean;
    push(...buffers: Uint8Array[]): void;
    pop(expectedChunkSize: number): Uint8Array | null;
    flush(): Uint8Array;
}
export declare function chunker(chunkSize: number, { flush }?: {
    flush?: boolean;
}): (data: Uint8Array | AsyncIterable<Uint8Array>) => AsyncIterable<Uint8Array>;
