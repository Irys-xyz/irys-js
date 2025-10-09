"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
const api_1 = require("./api");
const utilities_1 = require("./utilities");
const utils_1 = require("./utils");
const commitmentTransaction_1 = require("./commitmentTransaction");
class Network {
    constructor(api) {
        this.api = api;
    }
    async getStorageConfig() {
        return (await this.api.get(api_1.V1_API_ROUTES.GET_STORAGE_CONFIG)).data;
    }
    async getHeight() {
        return this.getInfo().then((r) => r.blockIndexHeight);
    }
    async getInfo() {
        return this.api
            .get(api_1.V1_API_ROUTES.GET_INFO)
            .then((r) => r.data);
    }
    async getLatestBlock() {
        return this.api.get(api_1.V1_API_ROUTES.GET_LATEST_BLOCK);
    }
    async getAnchor() {
        const encoded = (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_ANCHOR), "getting latest anchor")).data;
        return {
            blockHash: (0, utils_1.decodeBase58ToFixed)(encoded.blockHash, 32),
        };
    }
    async getPrice(size, ledgerId = 0) {
        const encoded = (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_TX_PRICE.replace("{ledgerId}", ledgerId.toString()).replace("{size}", size.toString())), "getting price for transaction")).data;
        return {
            permFee: BigInt(encoded.permFee),
            termFee: BigInt(encoded.termFee),
            ledger: Number(encoded.termFee),
            bytes: BigInt(encoded.bytes),
        };
    }
    async getCommitmentPrice(address, type) {
        const encoded = (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_COMMITMENT_PRICE.replace("{type}", (0, commitmentTransaction_1.encodeCommitmentType)(type).type).replace("{userAddress}", (0, utils_1.encodeAddress)(address))), "getting price for transaction")).data;
        return {
            value: BigInt(encoded.value),
            fee: BigInt(encoded.fee),
            userAddress: address,
            pledgeCount: 
            // TODO: fix
            encoded?.pledgeCount !== undefined
                ? BigInt(encoded.pledgeCount)
                : undefined,
        };
    }
}
exports.Network = Network;
//# sourceMappingURL=network.js.map