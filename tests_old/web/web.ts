import * as chai from "chai";
import * as crypto from "crypto";
import type Arweave from "../../src/web";
import { bufferToString, stringToBuffer } from "../../src/common/lib/utils";

const expect = chai.expect;

// let globals = <any>global;

// @ts-ignore
const arweave: Arweave = self.Arweave.init({ url: "https://arweave.net" });

// @ts-ignore
self.arweave = arweave;

const digestRegex = /^[a-z0-9-_]{43}$/i;
const liveAddressBalance = "498557055636";
const liveAddress = "9_666Wkk2GzL0LGd3xhb0jY7HqNy71BaV4sULQlJsBQ";
const liveTxid = "CE-1SFiXqWUEu0aSTebE6LC0-5JBAc3IAehYGwdF5iI";

const liveDataTxid = "H53lxlOS3ZZ6_yHiTEYIoEkw-aBWjJ-koXssCKCU3z4";

describe("Initialization", function () {
  it("should have components", function () {
    expect(arweave.api).to.an("object");

    expect(arweave.transactions).to.an("object");

    expect(arweave.wallets).to.an("object");

    expect(arweave.network).to.an("object");

    expect(arweave.crypto).to.an("object");

    // expect(arweave.silo).to.an("object");
  });
});

describe("Network Info", function () {
  it("should get network info", async function (this: any) {
    this.timeout(10000);

    const info = await arweave.network.getInfo();
    const peers = await arweave.network.getPeers();

    expect(info).to.be.an("object");

    expect(Object.keys(info)).to.contain.members(["height", "current", "release", "version", "blocks"]);

    expect(info.height).to.be.a("number").greaterThan(0);

    expect(peers).to.be.an("array");
  });
});

describe("Wallets and keys", function () {
  it("should generate valid JWKs", async function (this: any) {
    this.timeout(15000);

    const walletA = await arweave.wallets.generate();
    const walletB = await arweave.wallets.generate();

    expect(walletA).to.be.an("object", "New wallet is not an object");

    expect(walletA).to.have.all.keys("kty", "n", "e", "d", "p", "q", "dp", "dq", "qi");

    expect(walletA.kty).eq("RSA");

    expect(walletA.e).eq("AQAB");

    expect(walletA.n).to.match(/^[a-z0-9-_]{683}$/i);

    expect(walletA.d).to.match(/^[a-z0-9-_]{683}$/i);

    const addressA = await arweave.wallets.jwkToAddress(walletA);
    const addressB = await arweave.wallets.jwkToAddress(walletB);

    expect(addressA).to.be.a("string");

    expect(addressA).to.match(digestRegex);

    expect(addressB).to.match(digestRegex);

    expect(addressA).to.not.equal(addressB);
  });

  it("should get wallet info", async function (this: any) {
    this.timeout(5000);

    const wallet = await arweave.wallets.generate();

    const address = await arweave.wallets.jwkToAddress(wallet);

    const balance = await arweave.wallets.getBalance(address);

    const lastTx = await arweave.wallets.getLastTransactionID(address);

    expect(balance).to.be.a("string");

    expect(balance).eq("0");

    expect(lastTx).to.be.a("string");

    expect(lastTx).eq("");

    const balanceB = await arweave.wallets.getBalance(liveAddress);

    const lastTxB = await arweave.wallets.getLastTransactionID(liveAddress);

    expect(balanceB).to.be.a("string");

    expect(balanceB).eq(liveAddressBalance);

    expect(lastTxB).to.be.a("string");

    expect(lastTxB).eq(liveTxid);
  });
});

describe("Transactions", function () {
  it("should create and sign transactions", async function (this: any) {
    this.timeout(5000);

    const wallet = await arweave.wallets.generate();

    const transaction = await arweave.createTransaction({ data: "test" }, wallet);

    transaction.addTag("test-tag-1", "test-value-1");
    transaction.addTag("test-tag-2", "test-value-2");
    transaction.addTag("test-tag-3", "test-value-3");

    expect(transaction).to.be.an("object");

    expect(transaction.get("data")).eq("dGVzdA");

    expect(transaction.reward).to.match(/^[0-9]+$/);

    await arweave.transactions.sign(transaction, wallet);

    expect(Object.keys(transaction)).to.contain.members(["id", "data", "tags", "signature", "reward", "owner", "last_tx"]);

    expect(transaction.signature).to.match(/^[a-z0-9-_]+$/i);

    expect(transaction.id).to.match(digestRegex);

    const verified = await arweave.transactions.verify(transaction);

    expect(verified).to.be.a("boolean").and.to.eq(true);

    //@ts-ignore
    // Needs ts-ignoring as tags are readonly so chaning the tag like this isn't
    // normally an allowed operation, but it's a test, so...
    transaction.tags[1].value = "dGVzdDI";

    const verifiedWithModififedTags = await arweave.transactions.verify(transaction);

    expect(verifiedWithModififedTags).to.be.a("boolean");

    expect(verifiedWithModififedTags).to.be.false;
  });

  it("should create and sign transactions using external implicit wallet", async function (this: any) {
    this.timeout(120000);

    const transaction = await arweave.createTransaction({ data: "test" });
    await arweave.transactions.sign(transaction);

    const verified = await arweave.transactions.verify(transaction);
    expect(verified).to.be.a("boolean").and.to.be.eq(true);
  });

  it("should get transaction info", async function (this: any) {
    this.timeout(15000);

    const transactionStatus = await arweave.transactions.getStatus(liveDataTxid);
    const transaction = await arweave.transactions.get(liveDataTxid);

    expect(transactionStatus).to.be.a("object");
    expect(transactionStatus.confirmed).to.be.a("object");

    expect(Object.keys(transactionStatus.confirmed!)).to.contain.members(["block_indep_hash", "block_height", "number_of_confirmations"]);

    expect(transactionStatus.confirmed!.block_indep_hash).to.be.a("string");
    expect(transactionStatus.confirmed!.block_height).to.be.a("number");
    expect(transactionStatus.confirmed!.number_of_confirmations).to.be.a("number");

    expect(transaction.get("data", { decode: true, string: true })).to.contain("<title>CommunityXYZ</title>");

    const verify = await arweave.transactions.verify(transaction);
    expect(verify).to.be.a("boolean").and.to.be.eq(true);

    transaction.signature = "xxx";

    const verifyResult = await (() => {
      return new Promise((resolve) => {
        arweave.transactions.verify(transaction).catch((error: any) => {
          resolve(error);
        });
      });
    })();

    expect(verifyResult)
      .to.be.an.instanceOf(Error)
      .with.property("message")
      .and.match(/^.*invalid transaction signature.*$/i);
  });

  // it("should find transactions", async function (this: any) {
  //   this.timeout(5000);

  //   const results = await arweave.transactions.search("Silo-Name", "BmjRGIsemI77+eQb4zX8");

  //   expect(results).to.be.an("array").which.contains("Sgmyo7nUqPpVQWUfK72p5yIpd85QQbhGaWAF-I8L6yE");
  // });
});

describe("Encryption", function (this: any) {
  it("should encrypt and decrypt using key round trip", async function (this: any) {
    this.timeout(5000);

    const text = "some data to encrypt";

    const data = stringToBuffer(text);

    const key = crypto.randomBytes(32);

    const encrypted = await arweave.crypto.encrypt(data, key);

    expect(encrypted).to.have.lengthOf(48);

    const decrypted = await arweave.crypto.decrypt(encrypted, key);

    expect(bufferToString(decrypted)).eq(text);
  });

  it("should encrypt and decrypt using passphrase round trip", async function (this: any) {
    this.timeout(5000);

    const text = "some data to encrypt";

    const data = stringToBuffer(text);

    const key = "super-secret-password";

    const encrypted = await arweave.crypto.encrypt(data, key);

    expect(encrypted).to.have.lengthOf(48);

    const decrypted = await arweave.crypto.decrypt(encrypted, key);

    expect(bufferToString(decrypted)).eq(text);
  });
});

describe("GraphQL", function (this: any) {
  this.timeout(20000);
  it("should return a list of results", async function () {
    const txs = (
      await arweave.api.post(
        "/graphql",
        {
          query: `
      {
        transactions(
          tags: [
            { name: "App-Name", values: ["CommunityXYZ"] }
          ]
        ) {
          edges {
            node {
              id
            }
          }
        }
      }`,
        },
        { gatewayOnly: true },
      )
    ).data.data.transactions.edges;

    expect(txs).to.be.an("array");
    expect(txs.length).to.be.greaterThan(0);
  });

  it("should return an empty list when no results are found", async function () {
    const txs = (
      await arweave.api.post("/graphql", {
        query: `
      {
        transactions(
          owners: ["hnRI7JoN2vpv__w90o4MC_ybE9fse6SUemwQeY8hFxM"]
        ) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      })
    ).data.data.transactions.edges;

    expect(txs).to.be.an("array");
    expect(txs.length).eq(0);
  });
});
