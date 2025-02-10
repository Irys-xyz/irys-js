/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Wallet, encodeBase58 } from "ethers";
import { IRYS_TESTNET_CHAIN_ID } from "../src/common/constants";
import type { UnsignedTransactionInterface } from "../src/common/transaction";
import { createFixedUint8Array, sleep } from "../src/common/utils";
import IrysClient from "../src/node";

async function main() {
  const irys = await new IrysClient().node("http://172.17.0.9:8080/v1");

  const txProps: Partial<UnsignedTransactionInterface> = {
    anchor: createFixedUint8Array(32).fill(1),
    // signer: createFixedUint8Array(20).fill(0),
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
  const wallet = new Wallet(priv);
  console.log(await wallet.getAddress());

  const data = new Uint8Array(irys.storageConfig.chunkSize * 2.5).fill(69);

  await tx.prepareChunks(data);

  const signedTx = await tx.sign(wallet.signingKey);

  if (!(await signedTx.validateSignature())) {
    throw new Error("Invalid signature");
  }

  const serializedHeader = signedTx.getHeaderSerialized();

  console.log(`serialized tx header: ${serializedHeader}`);

  // post the tx header
  const res = await irys.api.post("/tx", serializedHeader, {
    headers: { "Content-Type": "application/json" },
  });

  if (res.status !== 200) {
    throw new Error("Unexpected tx status");
  }

  const chunks = signedTx.chunks.chunks;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = signedTx.getChunk(i, data);
    const ser = chunk.serialize();
    await irys.api.post("/chunk", ser, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`posted chunk ${i}`);
  }

  // wait 2 s
  await sleep(2_000);

  // get tx header and the chunk(s)
  const bs58Enc = encodeBase58(signedTx.id);
  const headerReq = await irys.api.get(`/tx/${bs58Enc}`);

  const bs58 = encodeBase58(signedTx.dataRoot);
  if (headerReq.data.data_root !== bs58) throw new Error("data_root mismatch");

  for (let i = 0; i < chunks.length; i++) {
    // TODO: fix this once @DanMacDonald fixes chunk promotion
    const chunkReq = await irys.api.get(
      `/chunk/data_root/${/* tx.ledgerNum */ 1}/${bs58}/${i}`
    );
    console.log(
      `Got chunk ${i}, data, ${JSON.stringify(chunkReq.data, null, 4)}`
    );
  }
  console.log("Done!");
}

(async function () {
  await main();
})();
