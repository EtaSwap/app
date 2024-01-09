
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
    signer: any;
    updateBalance?: () => void;
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
}



export enum typeWallet {
    HBAR = "HBAR",
    HSuite = "HSuite"
}

