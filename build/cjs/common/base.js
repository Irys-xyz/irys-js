"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseObject = exports.BaseEncoderSymbol = exports.BaseDecoderSymbol = void 0;
const tslib_1 = require("tslib");
// symbols attached to inserted data to
exports.BaseDecoderSymbol = Symbol("irys-base-object-decoder");
exports.BaseEncoderSymbol = Symbol("irys-base-object-encoder");
const Utils = tslib_1.__importStar(require("./utils"));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class BaseObject /* <T extends Record<string, any>> */ {
    get(field, options) {
        if (!Object.getOwnPropertyNames(this).includes(field)) {
            throw new Error(`Field "${field}" is not a property of the Irys Transaction class.`);
        }
        // Handle fields that are Uint8Arrays.
        // To maintain compat we encode them to b64url
        // if decode option is not specificed.
        if (this[field] instanceof Uint8Array) {
            if (options?.decode && options.string) {
                return Utils.bufferToString(this[field]);
            }
            if (options && options.decode && !options.string) {
                return this[field];
            }
            return Utils.bufferTob64Url(this[field]);
        }
        if (this[field] instanceof Array) {
            if (options?.decode !== undefined || options?.string !== undefined) {
                if (field === "tags") {
                    console.warn(`Did you mean to use 'transaction["tags"]' ?`);
                }
                throw new Error(`Cannot decode or stringify an array.`);
            }
            return this[field];
        }
        if (options && options.decode == true) {
            if (options && options.string) {
                return Utils.b64UrlToString(this[field]);
            }
            return Utils.b64UrlToBuffer(this[field]);
        }
        return this[field];
    }
}
exports.BaseObject = BaseObject;
//# sourceMappingURL=base.js.map