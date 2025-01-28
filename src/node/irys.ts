import type { IrysConfig } from "../common/irys";
import { IrysClient } from "../common/irys";

export class NodeIrysClient extends IrysClient {
  constructor(config: IrysConfig) {
    super(config);
  }

  public async ready(): Promise<this> {
    return super.ready();
  }
}
