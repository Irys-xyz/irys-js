import { hexlify } from "ethers/utils";
import type { UnsignedDataTransactionInterface } from "../src/common/dataTransaction";
import { createFixedUint8Array } from "../src/common/utils";
import IrysClient from "../src/node";
import { IRYS_TESTNET_CHAIN_ID } from "../src/common/constants";

async function main(): Promise<void> {
  const irys = await new IrysClient().node("http://172.17.0.2:8080/v1");

  const txProps: Partial<UnsignedDataTransactionInterface> = {
    anchor: createFixedUint8Array(32).fill(1),
    dataRoot: createFixedUint8Array(32).fill(3),
    dataSize: 242n,
    termFee: 99n,
    permFee: 98n,
    ledgerId: 0,
    bundleFormat: undefined,
    version: 0,
    chainId: IRYS_TESTNET_CHAIN_ID,
    headerSize: 0n,
  };

  const tx = irys.createDataTransaction(txProps);

  // dev test wallet 1
  // safe to commit, random & public already
  const priv =
    "0xdb793353b633df950842415065f769699541160845d73db902eadee6bc5042d0";

  const signedTx = await tx.sign(priv);
  const enc = signedTx.encode();
  const bs58Sig = enc.signature;
  const hexSig = hexlify(signedTx.signature);
  console.log("bs58", bs58Sig, "hex", hexSig, "enc", signedTx.toJSON());
  console.log("done!");
}

(async function (): Promise<void> {
  await main();
})();
