/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Wallet } from "ethers";
import { concatBuffers, encodeBase58, sleep } from "../src/common/utils";
import IrysClient from "../src/node";
import { PackedChunk } from "../src/common/chunk";
import { arrayCompare } from "../src/common/merkle";

async function main() {
  const irys = await new IrysClient().node("http://172.17.0.12:8080");

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

  await signedTx.upload(data);

  // wait 2 s
  await sleep(2_000);

  // get tx header and the chunk(s)
  const headerReq = await irys.api.get(`v1/tx/${signedTx.txId}`);

  const bs58 = encodeBase58(signedTx.dataRoot);
  if (headerReq.data.dataRoot !== bs58) throw new Error("data_root mismatch");
  let downloadedData = new Uint8Array();
  for (let i = 0; i < (signedTx?.chunks?.chunks?.length ?? 0); i++) {
    const chunkReq = await irys.api.get(
      `v1/chunk/data_root/${tx.ledgerId}/${bs58}/${i}`
    );
    console.log(
      `Got chunk ${i}, data, ${JSON.stringify(chunkReq.data, null, 4)}`
    );
    const packedChunk = PackedChunk.decode(irys, chunkReq.data);
    const unpackedChunk = await packedChunk.unpack();
    downloadedData = concatBuffers([downloadedData, unpackedChunk.bytes]);
    console.log(unpackedChunk);
  }
  if (!arrayCompare(downloadedData, data)) throw new Error("data mismatch!");
  console.log("Done!");
}

(async function () {
  await main();
})();
