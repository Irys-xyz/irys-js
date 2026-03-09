import { IrysClient } from "../common/irys";

export class NodeIrysClient extends IrysClient {
  public async ready(): Promise<this> {
    return super.ready();
  }
}
