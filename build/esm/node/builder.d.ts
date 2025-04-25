import type { ApiConfig } from "../common/api.js";
import type CryptoInterface from "../common/cryptoInterface.js";
import type { U64 } from "../common/dataTypes.js";
import type { StorageConfig } from "../common/storageConfig.js";
import type { AnyUrl } from "../common/types.js";
import { NodeIrysClient } from "./irys.js";
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
