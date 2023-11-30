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

export enum typeWallet {
    HBAR = "HBAR",
    HSuite = "HSuite"
}

