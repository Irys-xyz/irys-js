import { V1_API_ROUTES } from "./api.js";
import { Utils } from "./utilities.js";
import { decodeBase58ToFixed, encodeAddress } from "./utils.js";
import { encodeCommitmentType } from "./commitmentTransaction.js";
export class Network {
    api;
    constructor(api) {
        this.api = api;
    }
    async getStorageConfig() {
        return (await this.api.get(V1_API_ROUTES.GET_STORAGE_CONFIG)).data;
    }
    async getHeight() {
        return this.getInfo().then((r) => r.blockIndexHeight);
    }
    async getInfo() {
        return this.api
            .get(V1_API_ROUTES.GET_INFO)
            .then((r) => r.data);
    }
    async getLatestBlock() {
        return this.api.get(V1_API_ROUTES.GET_LATEST_BLOCK);
    }
    async getAnchor() {
        const encoded = (await Utils.checkAndThrow(this.api.get(V1_API_ROUTES.GET_ANCHOR), "getting latest anchor")).data;
        return {
            blockHash: decodeBase58ToFixed(encoded.blockHash, 32),
        };
    }
    async getPrice(size, ledgerId = 0) {
        const encoded = (await Utils.checkAndThrow(this.api.get(V1_API_ROUTES.GET_TX_PRICE.replace("{ledgerId}", ledgerId.toString()).replace("{size}", size.toString())), "getting price for transaction")).data;
        return {
            permFee: BigInt(encoded.permFee),
            termFee: BigInt(encoded.termFee),
            ledger: Number(encoded.termFee),
            bytes: BigInt(encoded.bytes),
        };
    }
    async getCommitmentPrice(address, type) {
        const encoded = (await Utils.checkAndThrow(this.api.get(V1_API_ROUTES.GET_COMMITMENT_PRICE.replace("{type}", encodeCommitmentType(type).type).replace("{userAddress}", encodeAddress(address))), "getting price for transaction")).data;
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
//# sourceMappingURL=network.js.map