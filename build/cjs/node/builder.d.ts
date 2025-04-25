import type { ApiConfig } from "../common/api";
import type CryptoInterface from "../common/cryptoInterface";
import type { U64 } from "../common/dataTypes";
import type { StorageConfig } from "../common/storageConfig";
import type { AnyUrl } from "../common/types";
import { NodeIrysClient } from "./irys";
export type NodeConfig = {
    nodes: ApiConfig[];
    chainId: U64;
    cryptoDriver: CryptoInterface;
    storageConfig?: StorageConfig;
};
export declare class IrysClientBuilder {
    builderConfig: NodeConfig;
    constructor(url?: AnyUrl);
    config(config: NodeConfig): this;
    node(url: AnyUrl): this;
    build(): Promise<NodeIrysClient>;
    then<TResult = NodeIrysClient>(onFulfilled?: ((value: NodeIrysClient) => TResult | PromiseLike<TResult>) | undefined | null, onRejected?: ((reason: Error) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult>;
    catch<TResult = NodeIrysClient>(onRejected?: ((reason: Error) => TResult | PromiseLike<TResult>) | undefined | null): Promise<NodeIrysClient | TResult>;
    finally(onFinally?: (() => void) | null | undefined): Promise<NodeIrysClient>;
}
