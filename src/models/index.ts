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

export interface IWallet {
    name: string;
    address: string;
    signer: any
}

export interface IWallets {
    [key: string]: IWalletsInfo
}

export interface IWalletsInfo {
    name: string;
    title: string;
    instance: any;
    image: string;
    icon: string;
    extensionId?: string; //WalletConnect
}



export enum typeWallet {
    HBAR = "HBAR",
    HSuite = "HSuite"
}

