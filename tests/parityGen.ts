import { toFixedUint8Array } from "../src/common/utils";
import type {
  CommitmentType,
  EncodedSignedCommitmentTransactionInterface,
} from "../src/common/commitmentTransaction";
import {
  CommitmentTypeId,
  SignedCommitmentTransaction,
  UnsignedCommitmentTransaction,
  signingEncodeCommitmentType,
} from "../src/common/commitmentTransaction";
import { randomBytes, randomInt } from "crypto";
import type { H256 } from "../src/common/dataTypes";
import { Wallet } from "ethers";
import { encode } from "rlp";
import { writeFileSync } from "fs";

export type TxSigningTestData = {
  priv: string;
  tx: EncodedSignedCommitmentTransactionInterface;
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
  const randomBytesData = randomBytes(bytes);
  let result = 0n;
  for (const byte of randomBytesData) {
    result = (result << 8n) + BigInt(byte);
  }
  return result & ((1n << BigInt(bits)) - 1n); // mask to exact bit count
}

// converts a buffer into a bigint
function bufferToBigInt(buffer: Buffer): bigint {
  const hex = buffer.toString("hex");
  // if (!hex) return 0n;
  return BigInt(`0x${hex}`);
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
    tx: signedTx.encode(),
    priv: randomKey.privateKey.slice(2),
  };
  return data;
};

async function testDataGen(): Promise<TxSigningTestData[]> {
  const count = 50;
  const res = await Promise.all(
    new Array(count).fill(undefined).map(async (_) => {
      const commitment = await makeRandCommitment();
      return commitment;
    })
  );
  // console.log(JSON.stringify(res));
  return res;
}

async function testWriteData() {
  writeFileSync("test-data.json", JSON.stringify(await testDataGen(), null, 2));
}

async function validateTestData() {
  const tx: TxSigningTestData = JSON.parse(
    `{"tx":{"id":"46cg5awBLzmK8zGsFs97J3YJHAQVTyB1FySskjCyVesr","version":2,"anchor":"B7Vu97BLVg5kMRFcrHFCAe8LezsG5oex7nrCCvCvpZ9Z","signer":"26FjURGa5vtqCFVvwFH9uHW6iroD","fee":"17838718446809954154","chainId":"15272589439873686136","signature":"nwWioEVEfkNpW9N1RNB6SmqhxCFTDFShSbiXSCoptWondbn52YWRH7r3M64i7EV6yxzALaq2x4YKAvmtxiLE2qDD","value":"67053412148687973108920691832952047552545674282032343640344973129326284535668","commitmentType":{"type":"pledge","pledgeCountBeforeExecuting":"4021617668727962134"}},"priv":"ab4bb4b151b25d45748d30d027241edcb95c95e41b1eacfb08733b7c7c7bbcdc"}`
  );
  const signedTx = SignedCommitmentTransaction.decode({} as any, tx.tx);
  const encoded1 = signingEncodeCommitmentType(signedTx.commitmentType);
  const encoded2 = encode(encoded1);
  console.log(`[${encoded2.toString()}]`);
  if (!(await signedTx.validateSignature())) {
    throw new Error("Invalid signature");
  }
}

(async function (): Promise<void> {
  // await main();
  // await testDataGen();
  await testWriteData();
  // await validateTestData();
  console.log("done!");
})();
