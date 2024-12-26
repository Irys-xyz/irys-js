/* eslint-disable no-useless-escape */
import { fromByteArray, toByteArray } from "base64-js";
import BigNumber from "bignumber.js";
import { webcrypto } from "crypto";
import type { FixedUint8Array } from "./dataTypes";

export type Base64UrlString = string;

export function concatBuffers(
  buffers: Uint8Array[] | ArrayBuffer[]
): Uint8Array {
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

export function writeTo(dest: Uint8Array, src: Readonly<Uint8Array>): void {
  dest.set(src, dest.length);
}

export function uint8ArrayToHexString(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function b64UrlToString(b64UrlString: string): string {
  const buffer = b64UrlToBuffer(b64UrlString);

  return bufferToString(buffer);
}

export function bufferToString(buffer: Uint8Array | ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export function stringToBuffer(string: string): Uint8Array {
  return new TextEncoder().encode(string);
}

export function stringToB64Url(string: string): string {
  return bufferTob64Url(stringToBuffer(string));
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
  return b64UrlString
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/\=/g, "");
}

export function b64UrlDecode(b64UrlString: string): string {
  b64UrlString = b64UrlString.replace(/\-/g, "+").replace(/\_/g, "/");
  let padding;
  b64UrlString.length % 4 === 0
    ? (padding = 0)
    : (padding = 4 - (b64UrlString.length % 4));
  return b64UrlString.concat("=".repeat(padding));
}

export function winstonToAr(winston: BigNumber.Value): BigNumber {
  return new BigNumber(winston).shiftedBy(-12);
}

export function arToWinston(ar: BigNumber.Value): BigNumber {
  return new BigNumber(ar).shiftedBy(12);
}

// TODO: TEMP

export async function hash(data: Uint8Array): Promise<Uint8Array> {
  // createHash("SHA-256").update(data).digest();
  return webcrypto.subtle
    .digest("SHA-256", data)
    .then((v) => new Uint8Array(v));
}

export function createFixedUint8Array<N extends number>(
  length: N
): FixedUint8Array<N> {
  return new Uint8Array(length) as FixedUint8Array<N>;
}

export function isFixedUnint8Array<N extends number>(
  array: Uint8Array,
  length: N
): array is FixedUint8Array<N> {
  return array.length === length;
}

export function toFixedUnint8Array<N extends number>(
  array: Uint8Array,
  length: N
): FixedUint8Array<N> {
  if (array.length !== length)
    throw new Error(
      `Unable to assert array ${array} has length ${length}, as it has length ${array.length}`
    );
  return array as FixedUint8Array<N>;
}

export function bigIntToUint8Array(bigInt: bigint): Uint8Array {
  const s = bigInt.toString(16).padStart(2, "0");
  return Uint8Array.from(
    s.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

export function uint8ArrayToBigInt(bytes: Uint8Array): bigint {
  return BigInt(
    "0x" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
  );
}

// converts a buffer into a bigint
export function bufferToBigInt(buffer: Buffer): bigint {
  const hex = buffer.toString("hex");
  // if (!hex) return 0n;
  return BigInt(`0x${hex}`);
}

export function bigIntToBuffer(note: bigint, size: number): Buffer {
  // taken from the bigint-buffer package
  // TODO: use that package as it has a much faster C impl
  const hex = note.toString(16);
  const buf = Buffer.from(
    hex.padStart(size * 2, "0").slice(0, size * 2),
    "hex"
  );
  // if(buf.length != NOTE_TS_SIZE) console.warn("buf len")
  return buf;
}

// export function bigIntToBuffer(note: bigint, size: number): Buffer {
//   // taken from the bigint-buffer package
//   // TODO: use that package as it has a much faster C impl
//   const hex = note.toString(16);
//   let s = hex.padStart(size * 2, "0").slice(0, size * 2);

//   // const buf = Buffer.from(

//   //   "hex"
//   // );
//   // if(buf.length != NOTE_TS_SIZE) console.warn("buf len")
//   // return buf;
// }

export function longToNByteArray(N: number, long: number): Uint8Array {
  const byteArray = new Uint8Array(N);
  if (long < 0)
    throw new Error("Array is unsigned, cannot represent -ve numbers");
  if (long > 2 ** (N * 8) - 1)
    throw new Error(`Number ${long} is too large for an array of ${N} bytes`);
  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }
  return byteArray;
}

export function longTo8ByteArray(long: number): Uint8Array {
  return longToNByteArray(8, long);
}

export function shortTo2ByteArray(short: number): Uint8Array {
  return longToNByteArray(2, short);
}

export function longTo16ByteArray(long: number): Uint8Array {
  return longToNByteArray(16, long);
}

export function longTo32ByteArray(long: number): Uint8Array {
  return longToNByteArray(32, long);
}

export function byteArrayToLong(byteArray: Uint8Array): number {
  let value = 0;
  for (let i = byteArray.length - 1; i >= 0; i--) {
    value = value * 256 + byteArray[i];
  }
  return value;
}

// function numberToTrimmedBEUint8Array(num: number): Uint8Array {
//   // Convert to array of bytes in BE format
//   const bytes = [];
//   while (num > 0) {
//     bytes.unshift(num & 0xff);
//     num = Math.floor(num / 256);
//   }

//   // Handle zero specially
//   if (bytes.length === 0) {
//     return new Uint8Array([0]);
//   }

//   return new Uint8Array(bytes);
// }

// export function bigintToTrimmedBEUint8Array(num: bigint) {
//   if (num < 0n) {
//     throw new Error("Number must be non-negative");
//   }

//   // Handle zero specially
//   if (num === 0n) {
//     return new Uint8Array([0]);
//   }

//   // Convert to array of bytes in BE format
//   const bytes = [];
//   while (num > 0n) {
//     bytes.unshift(Number(num & 0xffn));
//     num = num >> 8n;
//   }

//   return new Uint8Array(bytes);
// }

// export function uint8ArrayToBigInt2(array: Uint8Array) {
//   let result = 0n;
//   for (const byte of array) {
//     result = (result << 8n) | BigInt(byte);
//   }
//   return result;
// }

/**
 * Converts a snake_case string to camelCase
 * @param snakeCase The snake_case string to convert
 * @returns The camelCase converted string
 */
export function snakeToCamel(snakeCase: string): string {
  // Handle edge cases
  if (!snakeCase) return "";
  if (!snakeCase.includes("_")) return snakeCase;

  return snakeCase
    .toLowerCase()
    .replace(/_+([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 * @param camelCase The camelCase string to convert
 * @returns The snake_case converted string
 */
export function camelToSnake(camelCase: string): string {
  // Handle edge cases
  if (!camelCase) return "";
  if (!/[A-Z]/.test(camelCase)) return camelCase;

  return camelCase
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, ""); // Remove leading underscore if present
}
