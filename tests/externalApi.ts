/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Wallet } from "ethers";
import { encodeBase58, sleep } from "../src/common/utils";
import IrysClient from "../src/node";

async function main() {
  const irys = await new IrysClient().node("http://testnet-rpc.irys.xyz/v1");

  const tx = irys.createTransaction();

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

  await signedTx.uploadChunks(data);

  // wait 2 s
  await sleep(2_000);

  // get tx header and the chunk(s)
  const bs58Enc = encodeBase58(signedTx.id);
  const headerReq = await irys.api.get(`/tx/${bs58Enc}`);

  const bs58 = encodeBase58(signedTx.dataRoot);
  if (headerReq.data.dataRoot !== bs58) throw new Error("data_root mismatch");

  for (let i = 0; i < signedTx.chunks.chunks.length; i++) {
    const chunkReq = await irys.api.get(
      `/chunk/data_root/${tx.ledgerId}/${bs58}/${i}`
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
