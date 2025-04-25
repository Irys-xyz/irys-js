export type StorageConfigInterface = {
    chunkSize: number;
    numChunksInPartition: number;
    numChunksInRecallRange: number;
    numPartitionsInSlot: number;
    entropyPackingIterations: number;
};
export type EncodedStorageConfigInterface = {
    chunkSize: string;
    numChunksInPartition: string;
    numChunksInRecallRange: string;
    numPartitionsInSlot: string;
    entropyPackingIterations: string;
};
export declare class StorageConfig implements StorageConfigInterface {
    chunkSize: number;
    numChunksInPartition: number;
    numChunksInRecallRange: number;
    numPartitionsInSlot: number;
    entropyPackingIterations: number;
    constructor(config?: Partial<StorageConfigInterface>);
    static decode(encoded: EncodedStorageConfigInterface): StorageConfig;
}
