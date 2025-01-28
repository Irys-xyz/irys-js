import type { IrysClient } from "./irys";
import type { Base58, U64 } from "./dataTypes";
import { toExecAddr, toIrysAddr } from "./utils";
import { Wallet } from "ethers/wallet";

export class Account /* extends ExecWallet */ {
  public irys: IrysClient;

  constructor(irys: IrysClient) {
    this.irys = irys;
  }

  public async getBalance(address: string): Promise<U64> {
    return await this.irys.api.rpcProvider.getBalance(toExecAddr(address));
  }

  public getAddresses(key: string): { irys: Base58; exec: string } {
    const wallet = new Wallet(key);
    return { irys: toIrysAddr(wallet.address), exec: wallet.address };
  }

  //   public transfer(to: string, amount: bigint, wallet: Wallet | string) {
  //     const _wallet: Wallet = typeof wallet === "string" ? new Wallet(wallet) : wallet;
  //    _wallet.populateTransaction
  //   }
}
