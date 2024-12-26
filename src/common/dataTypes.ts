export type FixedUint8Array<N extends number> = Uint8Array & { length: N };

export type H256 = FixedUint8Array<32>;
export type Address = FixedUint8Array<20>;
export type u64 = bigint; // using `number` here is unsafe, due to MAX_SAFE_INTEGER being 2^53-1
export type u8 = number;
export type u32 = number;
export type TxRelativeChunkOffset = u32;
export type Signature = FixedUint8Array<65>;
export type Base64Url = string;
export type PartitionChunkOffset = u32;
