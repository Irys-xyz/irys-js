import type { IrysConfig } from "../common/irys";
import { IrysClient } from "../common/irys";
export declare class NodeIrysClient extends IrysClient {
    constructor(config: IrysConfig);
    ready(): Promise<this>;
}
