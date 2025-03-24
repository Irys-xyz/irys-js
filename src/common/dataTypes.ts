export type FixedUint8Array<N extends number> = Uint8Array & { length: N };

export type H256 = FixedUint8Array<32>;
export type Address = FixedUint8Array<20>;
export type U8 = number;
export type U16 = number;
export type U18 = number;
export type U32 = number;
export type U34 = number;
// using `number` here is unsafe, due to MAX_SAFE_INTEGER being 2^53-1
export type U64 = bigint;
export type U200 = bigint;

export type TxRelativeChunkOffset = U32;
export type PartitionChunkOffset = U32;
export type Signature = FixedUint8Array<65>;
export type Base64Url = string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Base58<T = never> = string;
export type Base64 = string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type UTF8<T = never> = string;
