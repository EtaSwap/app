export const NETWORKS = {
    MAINNET: 'mainnet',
    TESTNET: 'testnet',
};

export const GAS_LIMITS = {
    SaucerSwap: {
        exactTokenToToken: 900000, //877969    875079
        exactHBARToToken: 260000, //221207     203366
        exactTokenToHBAR: 1670000, //1629306   1623679     1336000
        tokenToExactToken: 920000, //894071    891182
        HBARToExactToken: 260000, //211040     218135      208000
        tokenToExactHBAR: 1690000, //1645353   1639941     1352000
    },
    Pangolin: {
        exactTokenToToken: 900000,
        exactHBARToToken: 260000,
        exactTokenToHBAR: 1670000,
        tokenToExactToken: 920000,
        HBARToExactToken: 260000,
        tokenToExactHBAR: 1690000,
    },
    HeliSwap: {
        exactTokenToToken: 900000,
        exactHBARToToken: 260000,
        exactTokenToHBAR: 1300000, // Experimental
        tokenToExactToken: 920000,
        HBARToExactToken: 250000,
        tokenToExactHBAR: 1300000, // Experimental
    },
};