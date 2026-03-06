import { readFileSync } from "fs";
import type { TxSigningTestData } from "../scripts/parityGen";
import { SignedCommitmentTransaction } from "../src/common/commitmentTransaction";

const raw = readFileSync("./tests/fixtures/commitments.json").toString("utf-8");
const testData: TxSigningTestData[] = JSON.parse(raw);

describe("Parity Test", () => {
  it.each(testData.map((td, i) => [i, td.tx.id, td] as const))(
    "fixture %i (%s) should decode and validate",
    async (_index, _id, element) => {
      const commitmentTx = SignedCommitmentTransaction.decode(
        undefined as any,
        element.tx
      );
      expect(commitmentTx.isSigned()).toBe(true);
      const isValid = await commitmentTx.validateSignature();
      expect(isValid).toBe(true);
    }
  );
});
