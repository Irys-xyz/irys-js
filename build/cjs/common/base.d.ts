export declare const BaseDecoderSymbol: unique symbol;
export declare const BaseEncoderSymbol: unique symbol;
export declare class BaseObject {
    [key: string]: any;
    get(field: string): string;
    get(field: string, options: {
        decode: true;
        string: false;
    }): Uint8Array;
    get(field: string, options: {
        decode: true;
        string: true;
    }): string;
}
