import { hexlify } from "ethers/utils";
import {
  UnsignedDataTransaction,
  type UnsignedDataTransactionInterface,
} from "../src/common/dataTransaction";
import {
  createFixedUint8Array,
  decodeBase58ToFixed,
} from "../src/common/utils";
import { IRYS_TESTNET_CHAIN_ID } from "../src/common/constants";
import type { UnsignedCommitmentTransactionInterface } from "../src/common/commitmentTransaction";
import {
  CommitmentTypeId,
  UnsignedCommitmentTransaction,
} from "../src/common/commitmentTransaction";

async function main(): Promise<void> {
  // dev test wallet 1
  // safe to commit, random & public already
  const priv =
    "0xdb793353b633df950842415065f769699541160845d73db902eadee6bc5042d0";

  const txProps: Partial<UnsignedDataTransactionInterface> = {
    anchor: createFixedUint8Array(32).fill(1),
    dataRoot: createFixedUint8Array(32).fill(3),
    dataSize: 242n,
    termFee: 99n,
    permFee: 98n,
    ledgerId: 0,
    bundleFormat: undefined,
    version: 1,
    chainId: IRYS_TESTNET_CHAIN_ID,
    headerSize: 0n,
  };

  const tx = new UnsignedDataTransaction(undefined as any, txProps);

  const signedTx = await tx.sign(priv);
  const enc = signedTx.encode();
  const bs58Sig = enc.signature;
  const hexSig = hexlify(signedTx.signature);
  console.log("bs58", bs58Sig, "hex", hexSig, "enc", signedTx.toJSON());

  const txProps2: Partial<UnsignedCommitmentTransactionInterface> = {
    anchor: decodeBase58ToFixed(
      "GqrCZEc5WU4gXj9qveAUDkNRPhsPPjWrD8buKAc5sXdZ",
      32
    ),
    commitmentType: {
      type: CommitmentTypeId.UNPLEDGE,
      pledgeCountBeforeExecuting: 18446744073709551615n,
      partitionHash: decodeBase58ToFixed(
        "12Yjd3YA9xjzkqDfdcXVWgyu6TpAq9WJdh6NJRWzZBKt",
        32
      ),
    },
    version: 2,
    chainId: 1270n,
    fee: 1234n,
    value: 222n,
  };

  // const tx2 = irys.createCommitmentTransaction(txProps2);
  const tx2 = new UnsignedCommitmentTransaction(undefined as any, txProps2);

  const signedTx2 = await tx2.sign(priv);
  if (!(await signedTx2.validateSignature())) {
    throw new Error("Invalid TX");
  }
  const enc2 = signedTx2.encode();
  const bs58Sig2 = enc2.signature;
  const hexSig2 = hexlify(signedTx2.signature);
  console.log("bs58", bs58Sig2, "hex", hexSig2, "enc", signedTx2.toJSON());
}

(async function (): Promise<void> {
  await main();
  console.log("done!");
})();
