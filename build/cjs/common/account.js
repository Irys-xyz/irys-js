"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const utils_1 = require("./utils");
const wallet_1 = require("ethers/wallet");
class Account /* extends ExecWallet */ {
    constructor(irys) {
        this.irys = irys;
    }
    async getBalance(address) {
        return await this.irys.api.rpcProvider.getBalance((0, utils_1.toExecAddr)(address));
    }
    getAddresses(key) {
        const wallet = new wallet_1.Wallet(key);
        return { irys: (0, utils_1.toIrysAddr)(wallet.address), exec: wallet.address };
    }
}
exports.Account = Account;
//# sourceMappingURL=account.js.map