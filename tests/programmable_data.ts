import { Contract, Wallet, ethers } from "ethers";
import { sleep } from "../src/common/utils";
import path from "path";
import { readFileSync } from "fs";
import { IrysClient } from "../src/node";

async function main(): Promise<void> {
  const irys = await new IrysClient().node("http://172.17.0.5:8080/v1");

  const tx = irys.createTransaction().ledger(0);

  const provider = irys.api.rpcProvider;
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
  console.log("initial read: ", read1);

  const data = Buffer.from("Hirys, World!");

  await tx.prepareChunks(data);

  const signedTx = await tx.sign(priv);

  if (!(await signedTx.validateSignature())) {
    throw new Error("Invalid signature");
  }

  await signedTx.uploadHeader();
  await signedTx.uploadChunks(data);

  const txId = signedTx.txId;

  // wait for chunks to migrate
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (
      await irys.api
        .get(`/tx/${txId}/local/data_start_offset`)
        .then((r) => r.status === 200)
        .catch((_) => false)
    ) {
      break;
    }
    console.log("waiting for promotion...");
    await sleep(100);
  }

  const transferTx =
    await contract.readPdChunkIntoStorage.populateTransaction();

  const accessList = await irys.programmableData
    .read(txId, 0, data.length)
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

  console.log(
    `retrieved data: ${Buffer.from(read2.slice(2), "hex").toString()}`
  );
}

(async function () {
  await main();
})();
