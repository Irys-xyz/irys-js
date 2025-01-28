import type { AxiosResponse } from "axios";
import type { IrysClient } from "./irys";
import type { Resolvable } from "./types";

export class Utils {
  public irys: IrysClient;

  constructor(irysClient: IrysClient) {
    this.irys = irysClient;
  }

  public async getPrice(
    size: number | bigint,
    ledgerId: bigint | number = 0
  ): Promise<bigint> {
    return BigInt(
      (
        await Utils.checkAndThrow(
          this.irys.api.get(`/price/${ledgerId.toString()}/${size}`),
          "getting price for transaction"
        )
      ).data
    );
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
