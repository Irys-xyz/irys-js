"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrysClientBuilder = void 0;
const tslib_1 = require("tslib");
const api_1 = require("../common/api");
const constants_1 = require("../common/constants");
const cryptoDriver_1 = tslib_1.__importDefault(require("./cryptoDriver"));
const irys_1 = require("./irys");
class IrysClientBuilder {
    constructor(url) {
        this.builderConfig = {
            nodes: [
                url
                    ? (0, api_1.isApiConfig)(url)
                        ? url
                        : { url: new URL(url) }
                    : { url: new URL("https://testnet-rpc.irys.xyz/v1/") },
            ],
            chainId: constants_1.IRYS_TESTNET_CHAIN_ID,
            cryptoDriver: new cryptoDriver_1.default(),
        };
    }
    config(config) {
        this.builderConfig = config;
        return this;
    }
    // TODO: re-enable once we support multiple backing nodes properly
    //   public nodes(nodes: AnyUrl[]): this {
    //     this.builderConfig.nodes = nodes;
    //     return this;
    //   }
    node(url) {
        this.builderConfig.nodes = [(0, api_1.isApiConfig)(url) ? url : { url: new URL(url) }];
        return this;
    }
    async build() {
        const client = new irys_1.NodeIrysClient({
            ...this.builderConfig,
            api: this.builderConfig.nodes[0],
        });
        await client.ready();
        return client;
    }
    // Promise contract functions, so users can `await` a builder instance to resolve the builder, instead of having to call build().
    // very cool, thanks Knex.
    async then(onFulfilled, onRejected) {
        const res = this.build();
        return res.then(onFulfilled, onRejected);
    }
    async catch(onRejected) {
        return this.then().catch(onRejected);
    }
    async finally(onFinally) {
        return this.then().finally(onFinally);
    }
}
exports.IrysClientBuilder = IrysClientBuilder;
//# sourceMappingURL=builder.js.map