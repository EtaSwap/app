import {NETWORKS} from "../../utils/constants";
import SaucerSwapLogo from "../../assets/img/saucerswap.ico";
import PangolinLogo from "../../assets/img/pangolin.png";
import HeliSwapLogo from "../../assets/img/heliswap.png";
import HSuiteLogo from "../../assets/img/hsuite.png";

export const oracles = (network) => network === NETWORKS.MAINNET ? {
    SaucerSwap: '0xc47037963fad3a5397cca3fef5c1c95839dc6363',
    Pangolin: '0xfa7206b4c9d46af2e2f7f3b1bd4d3aa2aeca6e71',
    HeliSwap: '0x51851a39da39c53f9b564cfdf7e6f55dc8850225',
} : {
    SaucerSwap: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
    Pangolin: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
};

export const exchange = (network) => network === NETWORKS.MAINNET ? '0.0.3745835' : '0.0.1772118';

export const feeWallet = (network) => network === NETWORKS.MAINNET ? '0.0.3745833' : '0.0.1772102';

export const hSuiteApiKey = (network) => network === NETWORKS.MAINNET ? 'd5db1f4a-8791-4f12-925f-920754547ce7' : '25f54dd3-47a1-4667-b9d8-2863585bc460';


export const defaultTokens = (tokensMap) => ([...tokensMap]
    .map(wrap => wrap[1])
    .sort((a, b) =>
        a.providers.length > b.providers.length
            ? -1
            : (a.providers.length === b.providers.length
                    ? (a.name > b.name ? 1 : -1)
                    : 1
            )
    ));

export const oracleSettings = (network) => network === NETWORKS.MAINNET ? {
    SaucerSwap: {
        icon: SaucerSwapLogo,
        aggregatorId: 'SaucerSwap',
        feePromille: 3,
        feeDEXPromille: 3,
        whbar: '0x0000000000000000000000000000000000163b5a',
    },
    Pangolin: {
        icon: PangolinLogo,
        aggregatorId: 'Pangolin',
        feePromille: 3,
        feeDEXPromille: 3,
        whbar: '0x00000000000000000000000000000000001a8837',
    },
    HeliSwap: {
        icon: HeliSwapLogo,
        aggregatorId: 'HeliSwap',
        feePromille: 5,
        feeDEXPromille: 3,
        whbar: '0x00000000000000000000000000000000002cc823',
    },
    // HSuite: {
    //     icon: HSuiteLogo,
    //     aggregatorId: 'HSuite',
    //     feePromille: 3,
    //     feeDEXPromille: 3,
    //     whbar: '',
    // },
} : {
    SaucerSwap: {
        icon: SaucerSwapLogo,
        aggregatorId: 'SaucerSwap',
        feePromille: 3,
        feeDEXPromille: 3,
        whbar: '0x000000000000000000000000000000000000e6a2',
    },
    Pangolin: {
        icon: PangolinLogo,
        aggregatorId: 'Pangolin',
        feePromille: 3,
        feeDEXPromille: 3,
        whbar: '0x000000000000000000000000000000000002690a',
    },
    HSuite: {
        icon: HSuiteLogo,
        aggregatorId: 'HSuite',
        feePromille: 3,
        feeDEXPromille: 3,
        whbar: '',
    },
};
