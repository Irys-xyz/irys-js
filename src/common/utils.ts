import { fromByteArray, toByteArray } from "base64-js";
import type { Address, Base58, FixedUint8Array } from "./dataTypes";
import bs58 from "bs58";
import { getBytes, hexlify } from "ethers/utils";
import { recoverAddress } from "ethers";
import { timingSafeEqual } from "node:crypto";

export type Base64UrlString = string;

export function concatBuffers(
  buffers: Uint8Array[] | ArrayBuffer[]
): Uint8Array {
  if (buffers.length === 0) {
    return new Uint8Array(0);
  }
  let totalLength = 0;
  for (const b of buffers) totalLength += b.byteLength;

  const temp = new Uint8Array(totalLength);
  let offset = 0;

  temp.set(new Uint8Array(buffers[0]), offset);
  offset += buffers[0].byteLength;

  for (let i = 1; i < buffers.length; i++) {
    temp.set(new Uint8Array(buffers[i]), offset);
    offset += buffers[i].byteLength;
  }

  return temp;
}

export function bufferToString(buffer: Uint8Array | ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export function stringToBuffer(string: string): Uint8Array {
  return new TextEncoder().encode(string);
}

export function b64UrlToBuffer(b64UrlString: string): Uint8Array {
  return new Uint8Array(toByteArray(b64UrlDecode(b64UrlString)));
}

export function bufferTob64(buffer: Uint8Array): string {
  return fromByteArray(new Uint8Array(buffer));
}

export function bufferTob64Url(buffer: Uint8Array): string {
  return b64UrlEncode(bufferTob64(buffer));
}

export function b64UrlEncode(b64UrlString: string): string {
  return b64UrlString.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function b64UrlDecode(b64UrlString: string): string {
  b64UrlString = b64UrlString.replace(/-/g, "+").replace(/_/g, "/");
  let padding;
  b64UrlString.length % 4 === 0
    ? (padding = 0)
    : (padding = 4 - (b64UrlString.length % 4));
  return b64UrlString.concat("=".repeat(padding));
}

export function createFixedUint8Array<N extends number>(
  length: N
): FixedUint8Array<N> {
  return new Uint8Array(length) as FixedUint8Array<N>;
}

export function toFixedUint8Array<N extends number>(
  array: Uint8Array,
  length: N
): FixedUint8Array<N> {
  if (array.length !== length)
    throw new Error(
      `Unable to assert array ${array} has length ${length}, as it has length ${array.length}`
    );
  return array as FixedUint8Array<N>;
}

// clamped versions - LE encoding
export function bigIntToBytes(value: bigint, numBytes: number): Uint8Array {
  const bytes = new Uint8Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    bytes[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
  }
  return bytes;
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  return result;
}

export function numberToBytes(value: number, numBytes: number): Uint8Array {
  const bytes = new Uint8Array(numBytes);
  if (value < 0)
    throw new Error("Array is unsigned, cannot represent -ve numbers");
  if (value > 2 ** (numBytes * 8) - 1)
    throw new Error(
      `Number ${value} is too large for an array of ${numBytes} bytes`
    );

  for (let i = 0; i < numBytes; i++) {
    bytes[i] = (value >> (i * 8)) & 0xff;
  }

  return bytes;
}

export function jsonBigIntSerialize(obj: unknown): string {
  return JSON.stringify(obj, (_, v) =>
    typeof v === "bigint" ? v.toString() : v
  );
}

// div_ceil, implemented manually due to BigInt / BigInt flooring by default
export function bigIntDivCeil(dividend: bigint, divisor: bigint): bigint {
  return dividend % divisor === 0n
    ? dividend / divisor
    : (dividend + divisor - 1n) / divisor;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const decodeBase58 = (string: Base58): Uint8Array => bs58.decode(string);

export const encodeBase58 = (bytes: Uint8Array): Base58 => bs58.encode(bytes);

export function decodeBase58ToFixed<N extends number>(
  string: Base58,
  length: N
): FixedUint8Array<N> {
  return toFixedUint8Array(decodeBase58(string), length);
}

export const irysToExecAddr = (irysAddr: string): string =>
  hexlify(decodeBase58(irysAddr));
export const execToIrysAddr = (execAddr: string): string =>
  execAddr.startsWith("0x")
    ? encodeBase58(getBytes(execAddr.toLowerCase()))
    : encodeBase58(getBytes("0x" + execAddr.toLowerCase()));

export const toIrysAddr = (addr: string): string =>
  addr.startsWith("0x") ? execToIrysAddr(addr) : addr;
export const toExecAddr = (addr: string): string =>
  addr.startsWith("0x") ? addr : irysToExecAddr(addr);

export const encodeAddress = (addr: Address): Base58<Address> =>
  encodeBase58(addr);

export const decodeAddress = (addr: Base58<Address> | string): Address =>
  decodeBase58ToFixed(toIrysAddr(addr), 20);

export const isAsyncIter = (obj: unknown): obj is AsyncIterable<Uint8Array> =>
  obj !== null &&
  obj !== undefined &&
  typeof obj === "object" &&
  Symbol.asyncIterator in obj;

// basic promise pool with bounded memory usage
export async function promisePool<T, N>(
  iter: Iterable<T> | AsyncIterable<T>,
  fn: (item: T, index: number) => Promise<N>,
  opts?: { concurrency?: number; itemCb?: (idx: number, item: N) => void }
): Promise<N[]> {
  const executing = new Set<Promise<void>>();
  const results: N[] = [];
  const concurrency = opts?.concurrency ?? 10;

  let index = 0;
  for await (const item of iter) {
    const currentIndex = index++;

    const promise = (async (): Promise<void> => {
      const result = await fn(item, currentIndex);
      results[currentIndex] = result;
      opts?.itemCb?.(currentIndex, result);
    })();

    const tracked = promise.finally(() => executing.delete(tracked));
    executing.add(tracked);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export function getMissingProperties<T>(
  obj: T,
  requiredProps: readonly string[]
): string[] {
  return requiredProps.filter((k) => obj[k as keyof T] === undefined);
}

export function throwOnMissingProperties<T>(
  obj: T,
  requiredProps: readonly string[]
): void {
  const missing = getMissingProperties(obj, requiredProps);
  if (missing.length)
    throw new Error(`Missing required properties: ${missing.join(", ")}`);
}

export const arrayCompare = (
  a: Uint8Array | unknown[],
  b: Uint8Array | unknown[]
): boolean => {
  if (a === b) return true; // ref check
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
};

export const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export function validateSignature(
  prehash: Uint8Array,
  signature: Uint8Array,
  signer: Uint8Array
): boolean {
  const recoveredAddress = getBytes(
    recoverAddress(prehash, hexlify(signature))
  );
  return constantTimeEqual(
    new Uint8Array(recoveredAddress),
    new Uint8Array(signer)
  );
}
