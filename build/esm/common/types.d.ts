import type { ApiConfig } from "./api.js";
export type Resolvable<T> = T | Promise<T>;
export type Constructable<A extends any[], T> = new (...args: A) => T;
export type AbstractConfig = {
    nodes?: AnyUrl[];
};
export type AnyUrl = ApiConfig | string | URL;
export type Data = Uint8Array | AsyncIterable<Uint8Array>;
export type FixMe = any;
