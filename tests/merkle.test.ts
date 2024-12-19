import { b64UrlToBuffer, bufferTob64Url } from "../src/common/lib/utils";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";
import { arweave, arweaveInstance } from "./_arweave";
import { MAX_CHUNK_SIZE, MIN_CHUNK_SIZE, bufferToInt, intToBuffer } from "../src/common/lib/merkle";

const rootB64Url = "t-GCOnjPWxdox950JsrFMu3nzOE4RktXpMcIlkqSUTw";
const root = b64UrlToBuffer(rootB64Url);
const pathB64Url =
  "7EAC9FsACQRwe4oIzu7Mza9KjgWKT4toYxDYGjWrCdp0QgsrYS6AueMJ_rM6ZEGslGqjUekzD3WSe7B5_fwipgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAnH6dASdQCigcL43lp0QclqBaSncF4TspuvxoFbn2L18EXpQrP1wkbwdIjSSWQQRt_F31yNvxtc09KkPFtzMKAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAIHiHU9QwOImFzjqSlfxkJJCtSbAox6TbbFhQvlEapSgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAA";
const path = b64UrlToBuffer(pathB64Url);

const offset = 262143;
const dataSize = 836907;
const merkle = arweave.merkle;

describe("Chunks", function () {
  jest.setTimeout(10000);

  const data = readFileSync("./tests/fixtures/rebar3");

  it("should validate all chunks from 1Mb.bin test file", async function () {
    // jest.setTimeout(5000);
    const data = readFileSync("./tests/fixtures/1mb.bin");

    const key = await arweaveInstance().wallets.generate();
    const tx = await arweaveInstance().createTransaction({ data: data, last_tx: "foo", reward: "1" }, key);

    await tx.prepareChunks(tx.data);
    const tx_data_root = b64UrlToBuffer(tx.data_root);
    const results = await Promise.all(
      tx.chunks!.chunks.map((_, idx) => {
        const chunk = tx.getChunk(idx, data);
        return merkle.validatePath(tx_data_root, parseInt(chunk.offset), 0, parseInt(chunk.data_size), b64UrlToBuffer(chunk.data_path));
      }),
    );
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).toBeTruthy();
    }
  });

  it("should validate all chunks from lotsofdata.bin test file", async function () {
    // jest.setTimeout(5000);
    const data = readFileSync("./tests/fixtures/lotsofdata.bin");

    const key = await arweaveInstance().wallets.generate();
    const tx = await arweaveInstance().createTransaction({ data: data, last_tx: "foo", reward: "1" }, key);

    await tx.prepareChunks(tx.data);
    const tx_data_root = b64UrlToBuffer(tx.data_root);
    const results = await Promise.all(
      tx.chunks!.chunks.map((_, idx) => {
        const chunk = tx.getChunk(idx, data);
        return merkle.validatePath(tx_data_root, parseInt(chunk.offset), 0, parseInt(chunk.data_size), b64UrlToBuffer(chunk.data_path));
      }),
    );
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).toBeTruthy();
    }
  });

  it("should convert ints to buffers and back up to Number.MAX_SAFE_INTEGER", async function () {
    // we cant test every number :)
    for (let i = 0; i < 1024 * 1024; i++) {
      const buf = intToBuffer(i);
      const ret = bufferToInt(buf);
      expect(ret).toBe(i);
    }
    for (let i = 0; i < Number.MAX_SAFE_INTEGER; i = i + 93444132157) {
      const buf = intToBuffer(i);
      const ret = bufferToInt(buf);
      expect(ret).toBe(i);
    }
    expect(Number.MAX_SAFE_INTEGER).toBe(bufferToInt(intToBuffer(Number.MAX_SAFE_INTEGER)));
  }, 20000);

  it("should infer the end offset when validating a chunk proof", async function () {
    // jest.setTimeout(5000);
    const key = await arweaveInstance().wallets.generate();
    const data = randomBytes(256 * 1024 * 3 - 128);
    const tx = await arweaveInstance().createTransaction({ data: data, last_tx: "foo", reward: "1" }, key);
    await tx.prepareChunks(data);
    const tx_data_root = b64UrlToBuffer(tx.data_root);

    const chunk1 = await tx.getChunk(1, data);

    // save the correct offset
    const correctEndOffset = parseInt(chunk1.offset);
    // use a valid but different offset (this is the minimum valid offset, since the the chunk is 256*1024)
    const validatedChunk = await merkle.validatePath(
      tx_data_root,
      correctEndOffset - 256 * 1024 + 1,
      0,
      parseInt(chunk1.data_size),
      b64UrlToBuffer(chunk1.data_path),
    );

    if (validatedChunk) {
      expect(validatedChunk.offset).toBe(correctEndOffset);
    }
    expect(validatedChunk).toBeTruthy();
  });

  it("should fail to validate a chunk proof when the offset is not within the chunk", async function () {
    // jest.setTimeout(5000);
    const key = await arweaveInstance().wallets.generate();
    const data = randomBytes(256 * 1024 + 256 * 50);
    const tx = await arweaveInstance().createTransaction({ data: data, last_tx: "foo", reward: "1" }, key);
    await tx.prepareChunks(data);
    const tx_data_root = b64UrlToBuffer(tx.data_root);
    const chunk1 = await tx.getChunk(1, data);

    // offset '4' is in chunk0, not chunk1, so invalid.
    const validatedChunk = await merkle.validatePath(tx_data_root, 4, 0, parseInt(chunk1.data_size), b64UrlToBuffer(chunk1.data_path));
    expect(validatedChunk).toBe(false);
  });

  it("should infer the chunk size when validating a chunk proof", async function () {
    // jest.setTimeout(5000);
    const key = await arweaveInstance().wallets.generate();
    const data = randomBytes(256 * 1024 * 2 - 128);
    const tx = await arweaveInstance().createTransaction({ data: data, last_tx: "foo", reward: "1" }, key);
    await tx.prepareChunks(data);
    const tx_data_root = b64UrlToBuffer(tx.data_root);
    const chunk1 = await tx.getChunk(1, data);

    const correctEndOffset = parseInt(chunk1.offset);

    // Give it a wrong, but valid offset.

    const validatedChunk = await merkle.validatePath(
      tx_data_root,
      correctEndOffset - 10,
      0,
      parseInt(chunk1.data_size),
      b64UrlToBuffer(chunk1.data_path),
    );
    if (validatedChunk) {
      expect(validatedChunk.chunkSize).toBe(b64UrlToBuffer(chunk1.chunk).byteLength);
    }
    expect(validatedChunk).toBeTruthy();
  });

  it("should build a tree with a valid root", async function () {
    const rootNode = await merkle.generateTree(data);

    expect(bufferTob64Url(rootNode.id)).toBe(rootB64Url);
  });

  it("should build valid proofs from tree", async function () {
    const rootNode = await merkle.generateTree(data);
    const proofs = await merkle.generateProofs(rootNode);
    expect(bufferTob64Url(proofs[0].proof)).toBe(pathB64Url);
  });

  it("should validate own proofs and reject invalid verification parameters", async function () {
    const rootNode = await merkle.generateTree(data);
    const rootHash = await merkle.computeRootHash(data);
    const proofs = await merkle.generateProofs(rootNode);

    type Args = [Uint8Array, number, number, number, Uint8Array];

    const testInput: Args = [rootHash, proofs[0].offset, 0, data.byteLength, proofs[0].proof];

    const didValidate = merkle.validatePath(...testInput);
    /* await merkle.validatePath.apply(validatePath, testInput); */

    expect(didValidate).toBeTruthy();

    const invalidInputA: Args = [
      rootHash,
      proofs[0].offset,
      0,
      data.byteLength,
      randomBytes(256), // invalid proof
    ];

    const didValidateWithInvalidInputA = await merkle.validatePath(...invalidInputA);

    expect(didValidateWithInvalidInputA).toBe(false);

    const invalidInputB: Args = [
      randomBytes(32), // invalid root node
      proofs[0].offset,
      0,
      data.byteLength,
      proofs[0].proof,
    ];

    const didValidateWithInvalidInputB = await merkle.validatePath(...invalidInputB);

    expect(didValidateWithInvalidInputB).toBe(false);
  });

  it("should validate a valid data path against a valid data root", async function () {
    expect(await merkle.validatePath(root, offset, 0, dataSize, path)).toBeTruthy();
  });

  it("should reject invalid root", async function () {
    const invalidRoot = b64UrlToBuffer("lX5K7gAUlIMt2hYYkoXVrjmVMnnjF6P6c5sov6mPqCm");
    expect(await merkle.validatePath(invalidRoot, offset, 0, dataSize, path)).toBe(false);
  });

  it("should reject invalid path", async function () {
    const invalidPath = b64UrlToBuffer(
      "VUSdubFW2cTvvr5s6VGSU2oxftxma77bRvils5fqikdj4qnP8xEG2HQQKyZeZGW5b9WNFlmDRBTyTJ8NnHQD3tLHc2VwctfdrXbkUODANATrOP6p8RNlSNT50jMKdSKymG0M8yv9g3LCoPB4QXawcRP6q9X5u1nnI7GFMlyuxoC4p21zWi7v68f1r73wXHWdH76VgCNbt0lEUDg1pW8sYvi6pdwAdTNdQIcAhqkO2JBJ2Kwtlxemj4E6NMKg9wi2pQHt6CKlX3T5rQdVd0Tt8czxrkOUBAW9J8XGK9iSLoj4LWZl3z4cKIFyZH7iUgIzCu9Id8jIoO93lVdgaUa4RW",
    );

    expect(await merkle.validatePath(root, offset, 0, dataSize, invalidPath)).toBe(false);
  });

  it("should split multiples of MAX_CHUNK_SIZE with one extra zero-length chunk", async function () {
    const data = randomBytes(MAX_CHUNK_SIZE * 4);
    const chunks = await merkle.chunkData(data);
    expect(chunks.length).toBe(5);
    chunks.forEach((chunk, idx) => {
      if (idx < 4) {
        expect(chunk.maxByteRange - chunk.minByteRange).toBe(MAX_CHUNK_SIZE);
      } else {
        expect(chunk.maxByteRange - chunk.minByteRange).toBe(0);
      }
    });
  });

  it("should adjust the last two chunks to avoid chunks under MIN_CHUNK_SIZE", async function () {
    const data = randomBytes(MAX_CHUNK_SIZE + MIN_CHUNK_SIZE - 1);
    const chunks = await merkle.chunkData(data);
    expect(chunks.length).toBe(2);
    const chunk0size = chunks[0].maxByteRange - chunks[0].minByteRange;
    const chunk1size = chunks[1].maxByteRange - chunks[1].minByteRange;
    expect(chunk0size).toBeGreaterThan(MIN_CHUNK_SIZE);
    expect(chunk1size).toBeGreaterThanOrEqual(MIN_CHUNK_SIZE);
    expect(chunk0size).toBe(chunk1size + 1);
  });
});
