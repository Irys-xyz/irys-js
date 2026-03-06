import type { ApiConfig } from "../common/api";
import { isApiConfig } from "../common/api";
import { IRYS_TESTNET_CHAIN_ID } from "../common/constants";
import type CryptoInterface from "../common/cryptoInterface";
import type { U64 } from "../common/dataTypes";
import type { StorageConfig } from "../common/storageConfig";
import type { AnyUrl } from "../common/types";
import NodeCryptoDriver from "./cryptoDriver";
import { NodeIrysClient } from "./irys";

export type NodeConfig = {
  node: ApiConfig;
  chainId: U64;
  cryptoDriver: CryptoInterface;
  storageConfig?: StorageConfig;
};

export class IrysClientBuilder {
  public builderConfig: NodeConfig;

  constructor(url?: AnyUrl) {
    this.builderConfig = {
      node: url
        ? isApiConfig(url)
          ? url
          : { url: new URL(url) }
        : { url: new URL("https://testnet-rpc.irys.xyz/v1/") },
      chainId: IRYS_TESTNET_CHAIN_ID,
      cryptoDriver: new NodeCryptoDriver(),
    };
  }

  public config(config: NodeConfig): this {
    this.builderConfig = config;
    return this;
  }

  public node(url: AnyUrl): this {
    this.builderConfig.node = isApiConfig(url) ? url : { url: new URL(url) };
    return this;
  }

  public async build(): Promise<NodeIrysClient> {
    const client = new NodeIrysClient({
      ...this.builderConfig,
      api: this.builderConfig.node,
    });
    await client.ready();
    return client;
  }

  // Promise contract functions, so users can `await` a builder instance to resolve the builder, instead of having to call build().
  // very cool, thanks Knex.
  public async then<TResult = NodeIrysClient>(
    onFulfilled?:
      | ((value: NodeIrysClient) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
    onRejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<TResult> {
    const res = this.build();
    return res.then(onFulfilled, onRejected) as Promise<TResult>;
  }

  public async catch<TResult = NodeIrysClient>(
    onRejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<NodeIrysClient | TResult> {
    return this.then().catch(onRejected);
  }

  public async finally(
    onFinally?: (() => void) | null | undefined
  ): Promise<NodeIrysClient> {
    return this.then().finally(onFinally);
  }
}
