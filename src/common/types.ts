import type { ApiConfig } from "./api";

export type Resolvable<T> = T | Promise<T>;

export type AnyUrl = ApiConfig | string | URL;

export type Data = Uint8Array | AsyncIterable<Uint8Array>;

export type FixMe = any;
