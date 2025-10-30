import { BlockTag, V1_API_ROUTES } from "./api.js";
import { Utils } from "./utilities.js";
import { decodeBase58ToFixed, encodeAddress } from "./utils.js";
import { encodeCommitmentType } from "./commitmentTransaction.js";
// TODO: return a "request builder" that allows for more modification?
export class Network {
    api;
    constructor(api) {
        this.api = api;
    }
    async getStorageConfig(config) {
        return (await this.api.get(V1_API_ROUTES.GET_STORAGE_CONFIG, config)).data;
    }
    async getHeight(config) {
        return this.getInfo(config).then((r) => BigInt(r.blockIndexHeight));
    }
    async getInfo(config) {
        return this.api
            .get(V1_API_ROUTES.GET_INFO, config)
            .then((r) => r.data);
    }
    async getLatestBlock(withPoa = false, config) {
        return this.getBlock(BlockTag.LATEST, withPoa, config);
    }
    async getBlock(param, withPoa = false, config) {
        return await Utils.wrapError(this.api.get(V1_API_ROUTES.GET_BLOCK.replace("{blockParam}", param.toString()) +
            (withPoa ? "/full" : ""), config), `getting block by param: ${param.toString()}`);
    }
    async getAnchor(config) {
        const encoded = (await Utils.wrapError(this.api.get(V1_API_ROUTES.GET_ANCHOR, config), "getting latest anchor")).data;
        return {
            blockHash: decodeBase58ToFixed(encoded.blockHash, 32),
        };
    }
    async getPrice(size, ledgerId = 0, config) {
        const encoded = (await Utils.wrapError(this.api.get(V1_API_ROUTES.GET_TX_PRICE.replace("{ledgerId}", ledgerId.toString()).replace("{size}", size.toString()), config), "getting price for data transaction")).data;
        return {
            permFee: BigInt(encoded.permFee),
            termFee: BigInt(encoded.termFee),
            ledger: Number(encoded.termFee),
            bytes: BigInt(encoded.bytes),
        };
    }
    async getCommitmentPrice(address, type, config) {
        const encoded = (await Utils.wrapError(this.api.get(V1_API_ROUTES.GET_COMMITMENT_PRICE.replace("{type}", encodeCommitmentType(type).type).replace("{userAddress}", encodeAddress(address)), config), "getting price for commitment transaction")).data;
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
        return (await Utils.wrapError(this.api.get(V1_API_ROUTES.GET_BLOCK_INDEX.replace("{height}", fromHeight.toString()).replace("{limit}", pageSize.toString()), config), "Getting block index page")).data;
    }
}
//# sourceMappingURL=network.js.map