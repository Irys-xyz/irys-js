import type { ApiConfig } from "../common/api.js";
import type CryptoInterface from "../common/cryptoInterface.js";
import type { U64 } from "../common/dataTypes.js";
import type { AnyUrl } from "../common/types.js";
import { NodeIrysClient } from "./irys.js";
export type NodeConfig = {
    nodes: ApiConfig[];
    chainId: U64;
    cryptoDriver: CryptoInterface;
};
export declare class IrysClientBuilder {
    builderConfig: NodeConfig;
    constructor(url?: AnyUrl);
    config(config: NodeConfig): this;
    node(url: AnyUrl): this;
    build(): Promise<NodeIrysClient>;
    then(onFulfilled?: ((value: NodeIrysClient) => any | PromiseLike<NodeIrysClient>) | undefined | null, onRejected?: (value: Error) => any | PromiseLike<Error> | undefined | null): Promise<NodeIrysClient | never>;
    catch(onReject?: ((value: NodeIrysClient) => any | PromiseLike<NodeIrysClient>) | undefined | null): Promise<null>;
    finally(onFinally?: (() => void) | null | undefined): Promise<NodeIrysClient | null>;
}
