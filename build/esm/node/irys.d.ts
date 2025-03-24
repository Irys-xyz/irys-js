import type { IrysConfig } from "../common/irys.js";
import { IrysClient } from "../common/irys.js";
export declare class NodeIrysClient extends IrysClient {
    constructor(config: IrysConfig);
    ready(): Promise<this>;
}
