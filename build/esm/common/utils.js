/* eslint-disable no-useless-escape */
import { fromByteArray, toByteArray } from "base64-js";
import bs58 from "bs58";
import BigNumber from "bignumber.js";
import { getBytes, hexlify } from "ethers/utils";
export function concatBuffers(buffers) {
    if (buffers.length === 0) {
        return new Uint8Array(0);
    }
    let totalLength = 0;
    for (const b of buffers)
        totalLength += b.byteLength;
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
export function writeTo(dest, src) {
    dest.set(src, dest.length);
}
export function uint8ArrayToHexString(uint8Array) {
    return Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
export function b64UrlToString(b64UrlString) {
    const buffer = b64UrlToBuffer(b64UrlString);
    return bufferToString(buffer);
}
export function bufferToString(buffer) {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}
export function stringToBuffer(string) {
    return new TextEncoder().encode(string);
}
export function stringToB64Url(string) {
    return bufferTob64Url(stringToBuffer(string));
}
export function b64UrlToBuffer(b64UrlString) {
    return new Uint8Array(toByteArray(b64UrlDecode(b64UrlString)));
}
export function bufferTob64(buffer) {
    return fromByteArray(new Uint8Array(buffer));
}
export function bufferTob64Url(buffer) {
    return b64UrlEncode(bufferTob64(buffer));
}
export function b64UrlEncode(b64UrlString) {
    return b64UrlString
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/\=/g, "");
}
export function b64UrlDecode(b64UrlString) {
    b64UrlString = b64UrlString.replace(/\-/g, "+").replace(/\_/g, "/");
    let padding;
    b64UrlString.length % 4 === 0
        ? (padding = 0)
        : (padding = 4 - (b64UrlString.length % 4));
    return b64UrlString.concat("=".repeat(padding));
}
// // TODO: TEMP
// export async function hash(data: Uint8Array): Promise<Uint8Array> {
//   // createHash("SHA-256").update(data).digest();
//   return webcrypto.subtle
//     .digest("SHA-256", data)
//     .then((v) => new Uint8Array(v));
// }
export function createFixedUint8Array(length) {
    return new Uint8Array(length);
}
export function isFixedUint8Array(array, length) {
    return array.length === length;
}
export function toFixedUint8Array(array, length) {
    if (array.length !== length)
        throw new Error(`Unable to assert array ${array} has length ${length}, as it has length ${array.length}`);
    return array;
}
export function bigIntToUint8Array(bigInt) {
    const s = bigInt.toString(16).padStart(2, "0");
    return Uint8Array.from(s.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
}
export function uint8ArrayToBigInt(bytes) {
    return BigInt("0x" +
        Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""));
}
export function numberToHex(number) {
    const hex = number.toString(16);
    return hex.length % 2 ? `0${hex}` : hex;
}
// clamped versions - LE encoding
export function bigIntToBytes(value, numBytes) {
    const bytes = new Uint8Array(numBytes);
    for (let i = 0; i < numBytes; i++) {
        bytes[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
    }
    return bytes;
}
export function bytesToBigInt(bytes) {
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
        result |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return result;
}
export function numberToBytes(value, numBytes) {
    const bytes = new Uint8Array(numBytes);
    if (value < 0)
        throw new Error("Array is unsigned, cannot represent -ve numbers");
    if (value > 2 ** (numBytes * 8) - 1)
        throw new Error(`Number ${value} is too large for an array of ${numBytes} bytes`);
    for (let i = 0; i < numBytes; i++) {
        bytes[i] = (value >> (i * 8)) & 0xff;
    }
    return bytes;
}
export function longTo8ByteArray(long) {
    return numberToBytes(long, 8);
}
export function shortTo2ByteArray(short) {
    return numberToBytes(short, 2);
}
export function longTo16ByteArray(long) {
    return numberToBytes(long, 16);
}
export function longTo32ByteArray(long) {
    return numberToBytes(long, 32);
}
export function byteArrayToLong(byteArray) {
    let value = 0;
    for (let i = byteArray.length - 1; i >= 0; i--) {
        value = value * 256 + byteArray[i];
    }
    return value;
}
/**
 * Converts a snake_case string to camelCase
 * @param snakeCase The snake_case string to convert
 * @returns The camelCase converted string
 */
export function snakeToCamel(snakeCase) {
    // Handle edge cases
    if (!snakeCase)
        return "";
    if (!snakeCase.includes("_"))
        return snakeCase;
    return snakeCase
        .toLowerCase()
        .replace(/_+([a-z])/g, (_, char) => char.toUpperCase());
}
/**
 * Converts a camelCase string to snake_case
 * @param camelCase The camelCase string to convert
 * @returns The snake_case converted string
 */
export function camelToSnake(camelCase) {
    // Handle edge cases
    if (!camelCase)
        return "";
    if (!/[A-Z]/.test(camelCase))
        return camelCase;
    return camelCase
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, ""); // Remove leading underscore if present
}
export function jsonBigIntSerialize(obj) {
    return JSON.stringify(obj, (_, v) => typeof v === "bigint" ? v.toString() : v);
}
// div_ceil, implemented manually due to BigInt / BigInt flooring by default
export function bigIntDivCeil(dividend, divisor) {
    return dividend % divisor === 0n
        ? dividend / divisor
        : (dividend + divisor - 1n) / divisor;
}
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const decodeBase58 = (string) => bs58.decode(string);
export const encodeBase58 = (bytes) => bs58.encode(bytes);
export function decodeBase58ToFixed(string, length) {
    return toFixedUint8Array(decodeBase58(string), length);
}
export const irysToExecAddr = (irysAddr) => hexlify(decodeBase58(irysAddr));
export const execToIrysAddr = (execAddr) => execAddr.startsWith("0x")
    ? encodeBase58(getBytes(execAddr.toLowerCase()))
    : encodeBase58(getBytes("0x" + execAddr.toLowerCase()));
export const toIrysAddr = (addr) => addr.startsWith("0x") ? execToIrysAddr(addr) : addr;
export const toExecAddr = (addr) => addr.startsWith("0x") ? addr : irysToExecAddr(addr);
export const encodeAddress = (addr) => encodeBase58(addr);
export const decodeAddress = (addr) => decodeBase58ToFixed(toIrysAddr(addr), 20);
export function mirysToIrys(mIrys) {
    return new BigNumber(mIrys).shiftedBy(-18);
}
export function irysTomIrys(irys) {
    return new BigNumber(irys).shiftedBy(18);
}
export const isCommitmentTx = (tx) => {
    // @ts-expect-error TS is dum sometimes
    if (tx?.commitmentType) {
        return true;
    }
    else {
        return false;
    }
};
export const isDataTx = (tx) => {
    return !isCommitmentTx(tx);
};
export const isAsyncIter = (obj) => typeof obj[Symbol.asyncIterator] ===
    "function";
// basic promise pool with bounded memory usage
export async function promisePool(iter, fn, opts) {
    const executing = new Set();
    const results = [];
    const concurrency = opts?.concurrency ?? 10;
    let index = 0;
    for await (const item of iter) {
        const currentIndex = index++;
        const promise = (async () => {
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
export function prettyPrintUint8Array(arr) {
    return `[${Array.from(arr).join(", ")}]`;
}
export const arrayCompare = (a, b) => {
    if (a === b)
        return true; // ref check
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
};
export const isNullish = (v) => v === undefined || Number.isNaN(v) || v === null;
//# sourceMappingURL=utils.js.map