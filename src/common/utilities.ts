import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import type { Resolvable } from "./types";

export class Utils {
  public irys: IrysClient;

  constructor(irysClient: IrysClient) {
    this.irys = irysClient;
  }

  // wraps a HTTP error with some context
  public static async wrapError<T, D>(
    response: Resolvable<AxiosResponse<T, D>>,
    context?: string
  ): Promise<AxiosResponse<T, D>> {
    try {
      return await response;
    } catch (e: any) {
      throw new HttpError(e, context);
    }
  }
}

export class HttpError extends Error {
  constructor(public inner: Error, ctx?: string) {
    super(`HTTP error:${ctx ? ` ${ctx} -` : ""} ${inner}`);
  }
}
