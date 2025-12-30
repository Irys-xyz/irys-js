import { readFileSync } from "fs";
import type { TxSigningTestData } from "./parityGen";
import { SignedCommitmentTransaction } from "../src/common/commitmentTransaction";

describe("Parity Test", () => {
  it("Should decode and validate all the fixture transactions", async () => {
    const raw = readFileSync("./tests/fixtures/commitments.json").toString(
      "utf-8"
    );
    const testData: TxSigningTestData[] = JSON.parse(raw);
    for (const element of testData) {
      const commitmentTx = SignedCommitmentTransaction.decode(
        undefined as any,
        element.tx
      );
      expect(commitmentTx.isSigned()).toBe(true);
      const isValid = await commitmentTx.validateSignature();
      expect(isValid).toBe(true);
    }
  });
});
