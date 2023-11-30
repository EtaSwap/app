import {GAS_LIMITS} from "../utils/constants";

export interface IToken {
    id: string;
    name: string;
    decimals: string;
    icon: string;
    symbol: string;
    address: string;
    logoURI: string;
    chainId: number;
    image: string;
    solidityAddress: string;
    token_id: string;
    providers: string[];
}

export interface IHSuitePool{
    tokens: {
        base: {id: string};
        swap: {id: string};
    }
}

export interface IGASLIMITS {
    [key: string]: {
        exactTokenToToken: number;
        exactHBARToToken: number;
        exactTokenToHBAR: number;
        tokenToExactToken: number;
        HBARToExactToken: number;
        tokenToExactHBAR: number;
    };
}

export interface IWallet {
    name: string;
    address: string;
    signer: any
}

export interface IWallets {
    [key: string]: {
        name: string,
        title: string,
        instance: any,
        image: string,
        icon: string,
    }
}


export enum typeWallet {
    HBAR = "HBAR",
    HSuite = "HSuite"
}

