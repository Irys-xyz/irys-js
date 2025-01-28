import type Api from "./api";
import type { U64 } from "./dataTypes";
import { toExecAddr, toIrysAddr } from "./utils";

export class Account /* extends ExecWallet */ {
  public api: Api;

  constructor({ api }: { api: Api }) {
    this.api = api;
  }

  public async getBalance(address: string): Promise<U64> {
    return await this.api.rpcProvider.getBalance(toExecAddr(address));
  }

  public toExecutionAddress(address: string): string {
    return toExecAddr(address);
  }

  public toIrysAddress(address: string): string {
    return toIrysAddr(address);
  }

  //   public transfer(to: string, amount: bigint, wallet: Wallet | string) {
  //     const _wallet: Wallet = typeof wallet === "string" ? new Wallet(wallet) : wallet;
  //    _wallet.populateTransaction
  //   }
}
