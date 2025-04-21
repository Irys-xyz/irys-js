import { toExecAddr, toIrysAddr } from "./utils.js";
import { Wallet } from "ethers/wallet";
export class Account /* extends ExecWallet */ {
    irys;
    constructor(irys) {
        this.irys = irys;
    }
    async getBalance(address) {
        return await this.irys.api.rpcProvider.getBalance(toExecAddr(address));
    }
    getAddresses(key) {
        const wallet = new Wallet(key);
        return { irys: toIrysAddr(wallet.address), exec: wallet.address };
    }
}
//# sourceMappingURL=account.js.map