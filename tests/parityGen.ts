import { bufferToBigInt, toFixedUint8Array } from "../src/common/utils";
import type {
  CommitmentType,
  EncodedSignedCommitmentTransactionInterface,
} from "../src/common/commitmentTransaction";
import {
  CommitmentTypeId,
  UnsignedCommitmentTransaction,
} from "../src/common/commitmentTransaction";
import { randomBytes, randomInt } from "crypto";
import type { H256 } from "../src/common/dataTypes";
import { Wallet } from "ethers";

type TxSigningTestData = EncodedSignedCommitmentTransactionInterface & {
  priv: string;
};

/**
 * Produces a random bigint uniformly distributed between `min` and `max`, inclusive.
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive). Must be greater than or equal to `min`.
 * @returns A random bigint `x` such that `min <= x <= max`.
 */
function randomBigIntInRange(min: bigint, max: bigint): bigint {
  const range = max - min;
  const bits = range.toString(2).length;
  let result;
  do {
    result = randomBigInt(bits);
  } while (result > range);
  return min + result;
}

/**
 * Generate a random non-negative BigInt strictly less than 2^bits.
 *
 * @param bits - The number of bits of the resulting value (0 returns 0n)
 * @returns A BigInt in the range 0 to 2^bits - 1 (inclusive)
 */
function randomBigInt(bits: number) {
  const bytes = Math.ceil(bits / 8);
  const randomBytesData = randomBytes(bytes);
  let result = 0n;
  for (const byte of randomBytesData) {
    result = (result << 8n) + BigInt(byte);
  }
  return result & ((1n << BigInt(bits)) - 1n); // mask to exact bit count
}

const u64max = bufferToBigInt(Buffer.alloc(8).fill(255));
const u256max = bufferToBigInt(Buffer.alloc(4 * 8).fill(255));

const randomH256 = (): H256 => toFixedUint8Array(randomBytes(32), 32);

/**
 * Selects and returns a random CommitmentType.
 *
 * The result will be one of:
 * - `STAKE`
 * - `PLEDGE` (includes `pledgeCountBeforeExecuting`)
 * - `UNPLEDGE` (includes `pledgeCountBeforeExecuting` and `partitionHash`)
 * - `UNSTAKE`
 *
 * @returns A randomly chosen CommitmentType with the appropriate fields populated.
 * @throws Error If the internal random selection yields an unexpected value.
 */
function randomCommitmentType(): CommitmentType {
  // 1-4
  switch (randomInt(1, 5)) {
    case 1:
      return { type: CommitmentTypeId.STAKE };
    case 2:
      return {
        type: CommitmentTypeId.PLEDGE,
        pledgeCountBeforeExecuting: randomBigIntInRange(0n, u64max),
      };
    case 3:
      return {
        type: CommitmentTypeId.UNPLEDGE,
        pledgeCountBeforeExecuting: randomBigIntInRange(0n, u64max),
        partitionHash: randomH256(),
      };
    case 4:
      return { type: CommitmentTypeId.UNSTAKE };
    default:
      throw new Error(`Impossible`);
  }
}

const makeRandCommitment = async (): Promise<TxSigningTestData> => {
  const unsignedTx = new UnsignedCommitmentTransaction(undefined as any, {
    anchor: toFixedUint8Array(randomBytes(32), 32),
    commitmentType: randomCommitmentType(),
    version: 2,
    chainId: randomBigIntInRange(0n, u64max),
    fee: randomBigIntInRange(0n, u64max),
    value: randomBigIntInRange(0n, u256max),
  });
  const randomKey = Wallet.createRandom();
  const signedTx = await unsignedTx.sign(randomKey.privateKey);
  const data: TxSigningTestData = {
    ...signedTx.encode(),
    priv: randomKey.privateKey,
  };
  return data;
};

/**
 * Generates ten random encoded signed commitment transactions, JSON-stringifies each, and logs the resulting array.
 */
async function testDataGen() {
  const count = 10;
  const res = await Promise.all(
    new Array(count).fill(undefined).map(async (_) => {
      const commitment = await makeRandCommitment();
      return JSON.stringify(commitment);
    })
  );
  console.log(res);
}

(async function (): Promise<void> {
  // await main();
  await testDataGen();
  console.log("done!");
})();