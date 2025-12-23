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

function randomBigIntInRange(min: bigint, max: bigint): bigint {
  const range = max - min;
  const bits = range.toString(2).length;
  let result;
  do {
    result = randomBigInt(bits);
  } while (result > range);
  return min + result;
}

function randomBigInt(bits: number) {
  const bytes = Math.ceil(bits / 8);
  const randomBytes = crypto.getRandomValues(new Uint8Array(bytes));
  let result = 0n;
  for (const byte of randomBytes) {
    result = (result << 8n) + BigInt(byte);
  }
  return result & ((1n << BigInt(bits)) - 1n); // mask to exact bit count
}

const u64max = bufferToBigInt(Buffer.alloc(8).fill(255));
const u256max = bufferToBigInt(Buffer.alloc(4 * 8).fill(255));

const randomH256 = (): H256 => toFixedUint8Array(randomBytes(32), 32);

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
