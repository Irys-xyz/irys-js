"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeIrysClient = void 0;
const irys_1 = require("../common/irys");
class NodeIrysClient extends irys_1.IrysClient {
    constructor(config) {
        super(config);
    }
    async ready() {
        return super.ready();
    }
}
exports.NodeIrysClient = NodeIrysClient;
//# sourceMappingURL=irys.js.map