import type { IrysClient } from "./irys";
import type { U64 } from "./dataTypes";
import { toExecAddr, toIrysAddr } from "./utils";

export class Account /* extends ExecWallet */ {
  public irys: IrysClient;

  constructor(irys: IrysClient) {
    this.irys = irys;
  }

  public async getBalance(address: string): Promise<U64> {
    return await this.irys.api.rpcProvider.getBalance(toExecAddr(address));
  }

  //   public transfer(to: string, amount: bigint, wallet: Wallet | string) {
  //     const _wallet: Wallet = typeof wallet === "string" ? new Wallet(wallet) : wallet;
  //    _wallet.populateTransaction
  //   }
}
