"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Network = void 0;
const api_1 = require("./api");
const utilities_1 = require("./utilities");
const utils_1 = require("./utils");
const commitmentTransaction_1 = require("./commitmentTransaction");
// TODO: return a "request builder" that allows for more modification?
class Network {
    constructor(api) {
        this.api = api;
    }
    async getStorageConfig(config) {
        return (await this.api.get(api_1.V1_API_ROUTES.GET_STORAGE_CONFIG, config)).data;
    }
    async getHeight(config) {
        return this.getInfo(config).then((r) => BigInt(r.blockIndexHeight));
    }
    async getInfo(config) {
        return this.api
            .get(api_1.V1_API_ROUTES.GET_INFO, config)
            .then((r) => r.data);
    }
    async getLatestBlock(withPoa = false, config) {
        return this.getBlock(api_1.BlockTag.LATEST, withPoa, config);
    }
    async getBlock(param, withPoa = false, config) {
        return await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_BLOCK.replace("{blockParam}", param.toString()) +
            (withPoa ? "/full" : ""), config), `getting block by param: ${param.toString()}`);
    }
    async getAnchor(config) {
        const encoded = (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_ANCHOR, config), "getting latest anchor")).data;
        return {
            blockHash: (0, utils_1.decodeBase58ToFixed)(encoded.blockHash, 32),
        };
    }
    async getPrice(size, ledgerId = 0, config) {
        const encoded = (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_TX_PRICE.replace("{ledgerId}", ledgerId.toString()).replace("{size}", size.toString()), config), "getting price for data transaction")).data;
        return {
            permFee: BigInt(encoded.permFee),
            termFee: BigInt(encoded.termFee),
            ledger: Number(encoded.termFee),
            bytes: BigInt(encoded.bytes),
        };
    }
    async getCommitmentPrice(address, type, config) {
        const encoded = (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_COMMITMENT_PRICE.replace("{type}", (0, commitmentTransaction_1.encodeCommitmentType)(type).type).replace("{userAddress}", (0, utils_1.encodeAddress)(address)), config), "getting price for commitment transaction")).data;
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
    async getBlockIndex(fromHeight, pageSize = 100, config) {
        return (await utilities_1.Utils.checkAndThrow(this.api.get(api_1.V1_API_ROUTES.GET_BLOCK_INDEX.replace("{height}", fromHeight.toString()).replace("{limit}", pageSize.toString()), config), "Getting block index page")).data;
    }
}
exports.Network = Network;
//# sourceMappingURL=network.js.map