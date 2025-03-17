import { hexlify } from "ethers/utils";
import type { UnsignedTransactionInterface } from "../src/common/transaction";
import { createFixedUint8Array } from "../src/common/utils";
import IrysClient from "../src/node";
import { IRYS_TESTNET_CHAIN_ID } from "../src/common/constants";

async function main(): Promise<void> {
  const irys = await new IrysClient().node("http://172.17.0.6:8080/v1");

  const txProps: Partial<UnsignedTransactionInterface> = {
    anchor: createFixedUint8Array(32).fill(1),
    dataRoot: createFixedUint8Array(32).fill(3),
    dataSize: 1024n,
    termFee: 100n,
    permFee: 1n,
    ledgerId: 0,
    bundleFormat: 0n,
    version: 0,
    chainId: IRYS_TESTNET_CHAIN_ID,
  };

  const tx = irys.createTransaction(txProps);

  // dev test wallet 1
  // safe to commit, random & public already
  const priv =
    "0xdb793353b633df950842415065f769699541160845d73db902eadee6bc5042d0";

  const signedTx = await tx.sign(priv);
  const bs58Sig = signedTx.header.signature;
  const hexSig = hexlify(signedTx.signature);

  console.log("bs58", bs58Sig, "hex", hexSig);
}

(async function (): Promise<void> {
  await main();
})();
