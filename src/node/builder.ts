import type { ApiConfig } from "../common/api";
import { isApiConfig } from "../common/api";
import { IRYS_CHAIN_ID } from "../common/constants";
import type CryptoInterface from "../common/cryptoInterface";
import type { U64 } from "../common/dataTypes";
import type { AnyUrl } from "../common/types";
import NodeCryptoDriver from "./cryptoDriver";
import { NodeIrysClient } from "./irys";

export type NodeConfig = {
  nodes: ApiConfig[];
  chainId: U64;
  cryptoDriver: CryptoInterface;
};

export class IrysClientBuilder {
  public builderConfig: NodeConfig;

  constructor(url?: AnyUrl) {
    this.builderConfig = {
      nodes: [
        url
          ? isApiConfig(url)
            ? url
            : { url: new URL(url) }
          : { url: new URL("https://testnet-rpc.irys.xyz/v1/") },
      ],
      chainId: IRYS_CHAIN_ID,
      cryptoDriver: new NodeCryptoDriver(),
    };
  }

  public config(config: NodeConfig): this {
    this.builderConfig = config;
    return this;
  }
  // TODO: re-enable once we support multiple backing nodes properly
  //   public nodes(nodes: AnyUrl[]): this {
  //     this.builderConfig.nodes = nodes;
  //     return this;
  //   }

  public node(url: AnyUrl): this {
    this.builderConfig.nodes = [isApiConfig(url) ? url : { url: new URL(url) }];
    return this;
  }

  public async build(): Promise<NodeIrysClient> {
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
  public async then(
    onFulfilled?:
      | ((value: NodeIrysClient) => any | PromiseLike<NodeIrysClient>)
      | undefined
      | null,
    onRejected?: (value: Error) => any | PromiseLike<Error> | undefined | null
  ): Promise<NodeIrysClient | never> {
    const res = this.build();
    return res.then(onFulfilled, onRejected);
  }

  public async catch(
    onReject?:
      | ((value: NodeIrysClient) => any | PromiseLike<NodeIrysClient>)
      | undefined
      | null
  ): Promise<null> {
    return this.then().catch(onReject);
  }

  public async finally(
    onFinally?: (() => void) | null | undefined
  ): Promise<NodeIrysClient | null> {
    return this.then().finally(onFinally);
  }
}
