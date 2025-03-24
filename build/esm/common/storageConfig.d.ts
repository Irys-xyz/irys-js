export type StorageConfigInterface = {
    chunkSize: number;
    numChunksInPartition: number;
    numChunksInRecallRange: number;
    numPartitionsInSlot: number;
    entropyPackingIterations: number;
};
export declare class StorageConfig implements StorageConfigInterface {
    chunkSize: number;
    numChunksInPartition: number;
    numChunksInRecallRange: number;
    numPartitionsInSlot: number;
    entropyPackingIterations: number;
    constructor(config?: Partial<StorageConfigInterface>);
}
