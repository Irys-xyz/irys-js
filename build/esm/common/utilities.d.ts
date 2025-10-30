import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys.js";
import type { Resolvable } from "./types.js";
export declare class Utils {
    irys: IrysClient;
    constructor(irysClient: IrysClient);
    /**
     * Throws an error if the provided axios reponse has a status code != 200
     * @param response an axios response
     * @returns nothing if the status code is 200
     */
    static checkAndThrow<T, D>(response: Resolvable<AxiosResponse<T, D>>, context?: string, exceptions?: number[]): Promise<AxiosResponse<T, D>>;
    /**
     * Throws an error if the provided axios reponse has a status code != 200
     * @param response an axios response
     * @returns nothing if the status code is 200
     */
    static wrapError<T, D>(response: Resolvable<AxiosResponse<T, D>>, context?: string): Promise<AxiosResponse<T, D>>;
}
export declare class HttpError extends Error {
    inner: Error;
    constructor(inner: Error, ctx?: string);
}
