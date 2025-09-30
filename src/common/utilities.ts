import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import type { Resolvable } from "./types";

export class Utils {
  public irys: IrysClient;

  constructor(irysClient: IrysClient) {
    this.irys = irysClient;
  }

  /**
   * Throws an error if the provided axios reponse has a status code != 200
   * @param response an axios response
   * @returns nothing if the status code is 200
   */
  public static async checkAndThrow<T, D>(
    response: Resolvable<AxiosResponse<T, D>>,
    context?: string,
    exceptions?: number[]
  ): Promise<AxiosResponse<T, D>> {
    const res = await response;
    if (
      res?.status &&
      !(exceptions ?? []).includes(res.status) &&
      res.status != 200
    ) {
      throw new Error(
        `HTTP Error: ${context}: ${res.status} ${
          typeof res.data !== "string" ? res.statusText : res.data
        }`
      );
    }
    return res;
  }
}
