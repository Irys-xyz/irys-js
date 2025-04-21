"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promisePool = exports.isAsyncIter = exports.irysTomIrys = exports.mirysToIrys = exports.toExecAddr = exports.toIrysAddr = exports.execToIrysAddr = exports.irysToExecAddr = exports.encodeBase58 = exports.decodeBase58ToBuf = exports.sleep = exports.bigIntDivCeil = exports.jsonBigIntSerialize = exports.camelToSnake = exports.snakeToCamel = exports.byteArrayToLong = exports.longTo32ByteArray = exports.longTo16ByteArray = exports.shortTo2ByteArray = exports.longTo8ByteArray = exports.longToNByteArray = exports.bytesToBigInt = exports.bigIntToBytes = exports.bigIntToBuffer = exports.bufferToBigInt = exports.uint8ArrayToBigInt = exports.bigIntToUint8Array = exports.toFixedUint8Array = exports.isFixedUint8Array = exports.createFixedUint8Array = exports.b64UrlDecode = exports.b64UrlEncode = exports.bufferTob64Url = exports.bufferTob64 = exports.b64UrlToBuffer = exports.stringToB64Url = exports.stringToBuffer = exports.bufferToString = exports.b64UrlToString = exports.uint8ArrayToHexString = exports.writeTo = exports.concatBuffers = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-useless-escape */
const base64_js_1 = require("base64-js");
const bs58_1 = tslib_1.__importDefault(require("bs58"));
const bignumber_js_1 = tslib_1.__importDefault(require("bignumber.js"));
const utils_1 = require("ethers/utils");
function concatBuffers(buffers) {
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
exports.concatBuffers = concatBuffers;
function writeTo(dest, src) {
    dest.set(src, dest.length);
}
exports.writeTo = writeTo;
function uint8ArrayToHexString(uint8Array) {
    return Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
exports.uint8ArrayToHexString = uint8ArrayToHexString;
function b64UrlToString(b64UrlString) {
    const buffer = b64UrlToBuffer(b64UrlString);
    return bufferToString(buffer);
}
exports.b64UrlToString = b64UrlToString;
function bufferToString(buffer) {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}
exports.bufferToString = bufferToString;
function stringToBuffer(string) {
    return new TextEncoder().encode(string);
}
exports.stringToBuffer = stringToBuffer;
function stringToB64Url(string) {
    return bufferTob64Url(stringToBuffer(string));
}
exports.stringToB64Url = stringToB64Url;
function b64UrlToBuffer(b64UrlString) {
    return new Uint8Array((0, base64_js_1.toByteArray)(b64UrlDecode(b64UrlString)));
}
exports.b64UrlToBuffer = b64UrlToBuffer;
function bufferTob64(buffer) {
    return (0, base64_js_1.fromByteArray)(new Uint8Array(buffer));
}
exports.bufferTob64 = bufferTob64;
function bufferTob64Url(buffer) {
    return b64UrlEncode(bufferTob64(buffer));
}
exports.bufferTob64Url = bufferTob64Url;
function b64UrlEncode(b64UrlString) {
    return b64UrlString
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/\=/g, "");
}
exports.b64UrlEncode = b64UrlEncode;
function b64UrlDecode(b64UrlString) {
    b64UrlString = b64UrlString.replace(/\-/g, "+").replace(/\_/g, "/");
    let padding;
    b64UrlString.length % 4 === 0
        ? (padding = 0)
        : (padding = 4 - (b64UrlString.length % 4));
    return b64UrlString.concat("=".repeat(padding));
}
exports.b64UrlDecode = b64UrlDecode;
// // TODO: TEMP
// export async function hash(data: Uint8Array): Promise<Uint8Array> {
//   // createHash("SHA-256").update(data).digest();
//   return webcrypto.subtle
//     .digest("SHA-256", data)
//     .then((v) => new Uint8Array(v));
// }
function createFixedUint8Array(length) {
    return new Uint8Array(length);
}
exports.createFixedUint8Array = createFixedUint8Array;
function isFixedUint8Array(array, length) {
    return array.length === length;
}
exports.isFixedUint8Array = isFixedUint8Array;
function toFixedUint8Array(array, length) {
    if (array.length !== length)
        throw new Error(`Unable to assert array ${array} has length ${length}, as it has length ${array.length}`);
    return array;
}
exports.toFixedUint8Array = toFixedUint8Array;
function bigIntToUint8Array(bigInt) {
    const s = bigInt.toString(16).padStart(2, "0");
    return Uint8Array.from(s.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
}
exports.bigIntToUint8Array = bigIntToUint8Array;
function uint8ArrayToBigInt(bytes) {
    return BigInt("0x" +
        Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""));
}
exports.uint8ArrayToBigInt = uint8ArrayToBigInt;
// converts a buffer into a bigint
function bufferToBigInt(buffer) {
    const hex = buffer.toString("hex");
    // if (!hex) return 0n;
    return BigInt(`0x${hex}`);
}
exports.bufferToBigInt = bufferToBigInt;
function bigIntToBuffer(note, size) {
    // taken from the bigint-buffer package
    // TODO: use that package as it has a much faster C impl
    const hex = note.toString(16);
    const buf = Buffer.from(hex.padStart(size * 2, "0").slice(0, size * 2), "hex");
    return buf;
}
exports.bigIntToBuffer = bigIntToBuffer;
// clamped versions - LE encoding
function bigIntToBytes(value, numBytes) {
    const bytes = new Uint8Array(numBytes);
    for (let i = 0; i < numBytes; i++) {
        bytes[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
    }
    return bytes;
}
exports.bigIntToBytes = bigIntToBytes;
function bytesToBigInt(bytes) {
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
        result |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return result;
}
exports.bytesToBigInt = bytesToBigInt;
function longToNByteArray(N, long) {
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
exports.longToNByteArray = longToNByteArray;
function longTo8ByteArray(long) {
    return longToNByteArray(8, long);
}
exports.longTo8ByteArray = longTo8ByteArray;
function shortTo2ByteArray(short) {
    return longToNByteArray(2, short);
}
exports.shortTo2ByteArray = shortTo2ByteArray;
function longTo16ByteArray(long) {
    return longToNByteArray(16, long);
}
exports.longTo16ByteArray = longTo16ByteArray;
function longTo32ByteArray(long) {
    return longToNByteArray(32, long);
}
exports.longTo32ByteArray = longTo32ByteArray;
function byteArrayToLong(byteArray) {
    let value = 0;
    for (let i = byteArray.length - 1; i >= 0; i--) {
        value = value * 256 + byteArray[i];
    }
    return value;
}
exports.byteArrayToLong = byteArrayToLong;
/**
 * Converts a snake_case string to camelCase
 * @param snakeCase The snake_case string to convert
 * @returns The camelCase converted string
 */
function snakeToCamel(snakeCase) {
    // Handle edge cases
    if (!snakeCase)
        return "";
    if (!snakeCase.includes("_"))
        return snakeCase;
    return snakeCase
        .toLowerCase()
        .replace(/_+([a-z])/g, (_, char) => char.toUpperCase());
}
exports.snakeToCamel = snakeToCamel;
/**
 * Converts a camelCase string to snake_case
 * @param camelCase The camelCase string to convert
 * @returns The snake_case converted string
 */
function camelToSnake(camelCase) {
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
exports.camelToSnake = camelToSnake;
function jsonBigIntSerialize(obj) {
    return JSON.stringify(obj, (_, v) => typeof v === "bigint" ? v.toString() : v);
}
exports.jsonBigIntSerialize = jsonBigIntSerialize;
// div_ceil, implemented manually due to BigInt / BigInt flooring by default
function bigIntDivCeil(dividend, divisor) {
    return dividend % divisor === 0n
        ? dividend / divisor
        : (dividend + divisor - 1n) / divisor;
}
exports.bigIntDivCeil = bigIntDivCeil;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
const decodeBase58ToBuf = (string) => bs58_1.default.decode(string);
exports.decodeBase58ToBuf = decodeBase58ToBuf;
const encodeBase58 = (bytes) => bs58_1.default.encode(bytes);
exports.encodeBase58 = encodeBase58;
const irysToExecAddr = (irysAddr) => (0, utils_1.hexlify)((0, exports.decodeBase58ToBuf)(irysAddr.toLowerCase()));
exports.irysToExecAddr = irysToExecAddr;
const execToIrysAddr = (execAddr) => execAddr.startsWith("0x")
    ? (0, exports.encodeBase58)((0, utils_1.getBytes)(execAddr))
    : (0, exports.encodeBase58)((0, utils_1.getBytes)("0x" + execAddr));
exports.execToIrysAddr = execToIrysAddr;
const toIrysAddr = (addr) => addr.startsWith("0x") ? (0, exports.execToIrysAddr)(addr) : addr;
exports.toIrysAddr = toIrysAddr;
const toExecAddr = (addr) => addr.startsWith("0x") ? addr : (0, exports.irysToExecAddr)(addr);
exports.toExecAddr = toExecAddr;
function mirysToIrys(mIrys) {
    return new bignumber_js_1.default(mIrys).shiftedBy(-18);
}
exports.mirysToIrys = mirysToIrys;
function irysTomIrys(irys) {
    return new bignumber_js_1.default(irys).shiftedBy(18);
}
exports.irysTomIrys = irysTomIrys;
const isAsyncIter = (obj) => typeof obj[Symbol.asyncIterator] ===
    "function";
exports.isAsyncIter = isAsyncIter;
// basic promise pool
async function promisePool(iter, fn, opts) {
    const promises = [];
    const concurrency = opts?.concurrency ?? 10;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const itemCb = opts?.itemCb ?? ((_1, _2) => { });
    let processing = 0;
    for await (const item of iter) {
        while (processing >= concurrency) {
            await Promise.race(promises);
        }
        processing++;
        const promise = (async () => {
            const idx = promises.length;
            return await fn(item, idx).then((r) => {
                itemCb(idx, r);
                processing--;
                return r;
            });
        })();
        promises.push(promise);
    }
    return await Promise.all(promises);
}
exports.promisePool = promisePool;
//# sourceMappingURL=utils.js.map