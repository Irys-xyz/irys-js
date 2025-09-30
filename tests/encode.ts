import { StorageConfig } from "../src/common/storageConfig";
import { SignedTransaction } from "../src/common/transaction";
import IrysClient from "../src/node";

async function testSignedTxEncodeDecode(): Promise<void> {
  const irysBuilder = new IrysClient();
  irysBuilder.builderConfig.storageConfig = new StorageConfig({
    chunkSize: 256 * 1024,
    numChunksInPartition: 10,
    numChunksInRecallRange: 200,
    numPartitionsInSlot: 10,
    entropyPackingIterations: 1000,
  });
  const irys = await irysBuilder.build();

  const data = new Uint8Array(irys.storageConfig.chunkSize * 2.5).fill(69);

  const signedTx = await irys
    .createTransaction()
    .prepareChunks(data)
    .then((r) =>
      r.sign(
        "0xdb793353b633df950842415065f769699541160845d73db902eadee6bc5042d0"
      )
    );
  const encoded = signedTx.encode();
  const decoded = SignedTransaction.decode(irys, encoded);
  console.log(await decoded.validateSignature());
}
(async function () {
  await testSignedTxEncodeDecode();
})();
