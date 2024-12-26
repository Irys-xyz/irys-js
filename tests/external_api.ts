/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Wallet } from "ethers";
import { IRYS_CHAIN_ID, MAX_CHUNK_SIZE } from "../src/common/constants";
import Merkle from "../src/common/merkle";
import NodeCryptoDriver from "../src/common/node-driver";
import type { UnsignedTransactionInterface } from "../src/common/transaction";
import { UnsignedTransaction } from "../src/common/transaction";
import { createFixedUint8Array } from "../src/common/utils";
import Api, { joinPaths } from "../src/common/api";
import { StorageConfig } from "../src/common/storageConfig";

async function main() {
  const crypto = new NodeCryptoDriver();

  const url = new URL("http://irys-node.jtr.local:8080/v1");
  const x = new URL(joinPaths(url.pathname, "/tx"), url);
  console.log(x.toString());
  const api = new Api({ url, timeout: 9999999 });
  const storageConfig = StorageConfig.fromSnakeConfig(
    (await api.get("/network/config")).data
  );

  const merkle = new Merkle({
    deps: { crypto, storageConfig },
  });

  // const txProps: Partial<UnsignedTransactionInterface> = {
  // anchor: createFixedUint8Array(32).fill(1),
  // signer: createFixedUint8Array(20).fill(0),
  // dataRoot: createFixedUint8Array(32).fill(3),
  // dataSize: 1024n,
  // termFee: 100n,
  // permFee: undefined,
  // ledgerNum: 0n,
  // bundleFormat: undefined,
  // version: 0,
  // chainId: IRYS_CHAIN_ID,
  // };

  const txProps: Partial<UnsignedTransactionInterface> = {
    anchor: createFixedUint8Array(32).fill(1),
    // signer: createFixedUint8Array(20).fill(0),
    dataRoot: createFixedUint8Array(32).fill(3),
    dataSize: 1024n,
    termFee: 100n,
    permFee: 1n,
    ledgerNum: 0n,
    bundleFormat: 0n,
    version: 0,
    chainId: IRYS_CHAIN_ID,
  };

  const tx = new UnsignedTransaction({
    deps: { merkle },
    attributes: txProps,
  });

  // dev test wallet 1
  // safe to commit, random & public already
  const priv =
    "0xdb793353b633df950842415065f769699541160845d73db902eadee6bc5042d0";
  const wallet = new Wallet(priv);
  console.log(await wallet.getAddress());

  const data = new Uint8Array(MAX_CHUNK_SIZE * 2.5).fill(69);

  await tx.prepareChunks(data);

  const signedTx = await tx.sign(wallet.signingKey);

  if (!(await signedTx.validateSignature())) {
    throw new Error("Invalid signature");
  }

  const serializedHeader = signedTx.getHeaderSerialized();

  // post the tx header
  const res = await api.post("/tx", serializedHeader, {
    headers: { "Content-Type": "application/json" },
  });

  if (res.status !== 200) {
    throw new Error("Unexpected tx status");
  }

  const chunks = signedTx.chunks.chunks;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = signedTx.getChunk(i, data);
    const ser = chunk.serialize();
    // console.log("CHUNK", i, ser);
    const res = await api.post("/chunk", ser, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(res);
  }
}

(async function () {
  await main();
})();
