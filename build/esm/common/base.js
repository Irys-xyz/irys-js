// symbols attached to inserted data to
export const BaseDecoderSymbol = Symbol("irys-base-object-decoder");
export const BaseEncoderSymbol = Symbol("irys-base-object-encoder");
import * as Utils from "./utils.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class BaseObject /* <T extends Record<string, any>> */ {
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
//# sourceMappingURL=base.js.map