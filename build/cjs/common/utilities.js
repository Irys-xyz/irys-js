"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
class Utils {
    constructor(irysClient) {
        this.irys = irysClient;
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