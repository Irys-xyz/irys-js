// symbols attached to inserted data to
export const BaseDecoderSymbol = Symbol("irys-base-object-decoder");
export const BaseEncoderSymbol = Symbol("irys-base-object-encoder");
import * as Utils from "./utils";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class BaseObject /* <T extends Record<string, any>> */ {
  // protected properties: T;
  [key: string]: any;

  public get(field: string): string;
  public get(
    field: string,
    options: { decode: true; string: false }
  ): Uint8Array;
  public get(field: string, options: { decode: true; string: true }): string;

  public get(
    field: string,
    options?: {
      // encode the value to a string
      string?: boolean;
      // decode the encoded value
      decode?: boolean;
    }
  ): string | Uint8Array {
    if (!Object.getOwnPropertyNames(this).includes(field)) {
      throw new Error(
        `Field "${field}" is not a property of the Irys Transaction class.`
      );
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

  // set<K extends keyof T>(
  //   key: K,
  //   value: T[K],
  //   opts?: { encoder: any; decoder: any }
  // ): void {}
}
