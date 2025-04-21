export type CryptoInterface = {
    hash(data: Uint8Array, algorithm?: string): Promise<Uint8Array>;
};
export default CryptoInterface;
