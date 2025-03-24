"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
class Utils {
    constructor(irysClient) {
        this.irys = irysClient;
    }
    async getPrice(size, ledgerId = 0) {
        return BigInt((await Utils.checkAndThrow(this.irys.api.get(`/price/${ledgerId.toString()}/${size}`), "getting price for transaction")).data);
    }
    /**
     * Throws an error if the provided axios reponse has a status code != 200
     * @param response an axios response
     * @returns nothing if the status code is 200
     */
    static async checkAndThrow(response, context, exceptions) {
        const res = await response;
        if (res?.status &&
            !(exceptions ?? []).includes(res.status) &&
            res.status != 200) {
            throw new Error(`HTTP Error: ${context}: ${res.status} ${typeof res.data !== "string" ? res.statusText : res.data}`);
        }
        return res;
    }
}
exports.Utils = Utils;
//# sourceMappingURL=utilities.js.map