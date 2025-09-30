/// <reference types="node" />
import type { Base58, FixedUint8Array } from "./dataTypes";
import BigNumber from "bignumber.js";
export type Base64UrlString = string;
export declare function concatBuffers(buffers: Uint8Array[] | ArrayBuffer[]): Uint8Array;
export declare function writeTo(dest: Uint8Array, src: Readonly<Uint8Array>): void;
export declare function uint8ArrayToHexString(uint8Array: Uint8Array): string;
export declare function b64UrlToString(b64UrlString: string): string;
export declare function bufferToString(buffer: Uint8Array | ArrayBuffer): string;
export declare function stringToBuffer(string: string): Uint8Array;
export declare function stringToB64Url(string: string): string;
export declare function b64UrlToBuffer(b64UrlString: string): Uint8Array;
export declare function bufferTob64(buffer: Uint8Array): string;
export declare function bufferTob64Url(buffer: Uint8Array): string;
export declare function b64UrlEncode(b64UrlString: string): string;
export declare function b64UrlDecode(b64UrlString: string): string;
export declare function createFixedUint8Array<N extends number>(length: N): FixedUint8Array<N>;
export declare function isFixedUint8Array<N extends number>(array: Uint8Array, length: N): array is FixedUint8Array<N>;
export declare function toFixedUint8Array<N extends number>(array: Uint8Array, length: N): FixedUint8Array<N>;
export declare function bigIntToUint8Array(bigInt: bigint): Uint8Array;
export declare function uint8ArrayToBigInt(bytes: Uint8Array): bigint;
export declare function bufferToBigInt(buffer: Buffer): bigint;
export declare function bigIntToBuffer(note: bigint, size: number): Buffer;
export declare function bigIntToBytes(value: bigint, numBytes: number): Uint8Array;
export declare function bytesToBigInt(bytes: Uint8Array): bigint;
export declare function longToNByteArray(N: number, long: number): Uint8Array;
export declare function longTo8ByteArray(long: number): Uint8Array;
export declare function shortTo2ByteArray(short: number): Uint8Array;
export declare function longTo16ByteArray(long: number): Uint8Array;
export declare function longTo32ByteArray(long: number): Uint8Array;
export declare function byteArrayToLong(byteArray: Uint8Array): number;
/**
 * Converts a snake_case string to camelCase
 * @param snakeCase The snake_case string to convert
 * @returns The camelCase converted string
 */
export declare function snakeToCamel(snakeCase: string): string;
/**
 * Converts a camelCase string to snake_case
 * @param camelCase The camelCase string to convert
 * @returns The snake_case converted string
 */
export declare function camelToSnake(camelCase: string): string;
export declare function jsonBigIntSerialize(obj: any): string;
export declare function bigIntDivCeil(dividend: bigint, divisor: bigint): bigint;
export declare const sleep: (ms: number) => Promise<void>;
export declare const decodeBase58: (string: Base58) => Uint8Array;
export declare const encodeBase58: (bytes: Uint8Array) => Base58;
export declare function decodeBase58ToFixed<N extends number>(string: Base58, length: N): FixedUint8Array<N>;
export declare const irysToExecAddr: (irysAddr: string) => string;
export declare const execToIrysAddr: (execAddr: string) => string;
export declare const toIrysAddr: (addr: string) => string;
export declare const toExecAddr: (addr: string) => string;
export declare function mirysToIrys(mIrys: BigNumber.Value): BigNumber;
export declare function irysTomIrys(irys: BigNumber.Value): BigNumber;
export declare const isAsyncIter: (obj: any) => obj is AsyncIterable<Uint8Array>;
export declare function promisePool<T, N>(iter: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => Promise<N>, opts?: {
    concurrency?: number;
    itemCb?: (idx: number, item: N) => void;
}): Promise<N[]>;
