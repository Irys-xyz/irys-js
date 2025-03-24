import { isApiConfig } from "../common/api.js";
import { IRYS_TESTNET_CHAIN_ID } from "../common/constants.js";
import NodeCryptoDriver from "./cryptoDriver.js";
import { NodeIrysClient } from "./irys.js";
export class IrysClientBuilder {
    builderConfig;
    constructor(url) {
        this.builderConfig = {
            nodes: [
                url
                    ? isApiConfig(url)
                        ? url
                        : { url: new URL(url) }
                    : { url: new URL("https://testnet-rpc.irys.xyz/v1/") },
            ],
            chainId: IRYS_TESTNET_CHAIN_ID,
            cryptoDriver: new NodeCryptoDriver(),
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
        this.builderConfig.nodes = [isApiConfig(url) ? url : { url: new URL(url) }];
        return this;
    }
    async build() {
        const client = new NodeIrysClient({
            api: this.builderConfig.nodes[0],
            chainId: this.builderConfig.chainId,
            cryptoDriver: this.builderConfig.cryptoDriver,
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
    async catch(onReject) {
        return this.then().catch(onReject);
    }
    async finally(onFinally) {
        return this.then().finally(onFinally);
    }
}
//# sourceMappingURL=builder.js.map