import { Contract, Wallet, encodeBase58, ethers } from "ethers";
import { IRYS_CHAIN_ID } from "../src/common/constants";
import Merkle from "../src/common/merkle";
import NodeCryptoDriver from "../src/common/node-driver";
import type { UnsignedTransactionInterface } from "../src/common/transaction";
import { UnsignedTransaction } from "../src/common/transaction";
import { createFixedUint8Array } from "../src/common/utils";
import Api, { joinPaths } from "../src/common/api";
import { ProgrammableData } from "../src/common/programmable_data";
import { StorageConfig } from "../src/common/storageConfig";
import path from "path";
import { readFileSync } from "fs";

async function main(): Promise<void> {
  const crypto = new NodeCryptoDriver();

  const url = new URL("http://172.17.0.4:8080");

  const apiUrl = new URL(joinPaths(url.pathname, "/v1"), url);

  const api = new Api({ url: apiUrl, timeout: 9999999 });
  const storageConfig = new StorageConfig(
    (await api.get("/network/config")).data
  );

  const merkle = new Merkle({
    deps: { crypto, storageConfig },
  });

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

  const provider = new ethers.JsonRpcProvider(url.toString());
  // dev test wallet 1
  // safe to commit, random & public already
  const priv =
    "0xdb793353b633df950842415065f769699541160845d73db902eadee6bc5042d0";
  const wallet = new Wallet(priv, provider);
  console.log(await wallet.getAddress());

  // copy from irys/fixtures/contracts/out/IrysProgrammableDataBasic.sol/ProgrammableDataBasic.json
  const pathToAbi = path.resolve("./tests/fixtures/ProgrammableDataBasic.json");
  // and make sure this address is valid! (it'll change if you modify the contract)
  const contractAddress = "0xf23e3584dc856656e7a811fc701fc4234df7de6e";

  const abi = JSON.parse(readFileSync(pathToAbi, { encoding: "utf-8" })).abi;
  const contract = new Contract(contractAddress, abi, wallet);

  const read1 = await contract.getStorage();
  console.log(read1);

  const data = Buffer.from("hello, world!");

  await tx.prepareChunks(data);

  const signedTx = await tx.sign(wallet.signingKey);

  if (!(await signedTx.validateSignature())) {
    throw new Error("Invalid signature");
  }

  const serializedHeader = signedTx.getHeaderSerialized();

  // post the tx header
  const res = await api.post("/tx", serializedHeader, {
    headers: { "Content-Type": "application/json" },
    timeout: 100000,
    retry: { retries: 0 },
  });

  if (res.status !== 200) {
    throw new Error("Unexpected tx status");
  }
  const txId = encodeBase58(signedTx.id);
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

  // wait for chunks to migrate
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (
      await api
        .get(`/tx/${txId}/local/data_start_offset`)
        .then((r) => r.status === 200)
        .catch((_) => false)
    )
      break;
  }

  const transferTx =
    await contract.readPdChunkIntoStorage.populateTransaction();

  const accessList = await new ProgrammableData({ api, storageConfig })
    .createTransaction()
    .read(signedTx.txId, 0, data.length)
    .toAccessList();

  // Add custom transaction parameters including access list
  const customizedTransferTx = {
    ...transferTx,
    accessList: [accessList],
    type: 2, // EIP-1559 transaction type
    maxFeePerGas: ethers.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
    gasLimit: 10000000,
  };

  const signedPdTx = await wallet.sendTransaction(customizedTransferTx);
  console.log("transaction hash:", signedPdTx.hash);
  const pdTxReceipt = await signedPdTx.wait();
  console.log(pdTxReceipt);
  const read2 = await contract.getStorage();
  console.log(read2);

  console.log(
    `retrieved data: ${Buffer.from(read2.slice(2), "hex").toString()}`
  );
}

(async function () {
  await main();
})();
