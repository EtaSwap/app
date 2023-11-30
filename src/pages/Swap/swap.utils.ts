import {NETWORKS} from "../../utils/constants";
// @ts-ignore
import SaucerSwapLogo from "../../assets/img/saucerswap.ico";
// @ts-ignore
import PangolinLogo from "../../assets/img/pangolin.png";
// @ts-ignore
import HeliSwapLogo from "../../assets/img/heliswap.png";
// @ts-ignore
import HSuiteLogo from "../../assets/img/hsuite.png";
import {BigNumber, ethers} from "ethers";
import axios from "axios";
import {TokenId} from "@hashgraph/sdk";
import {sqrt} from "../../utils/utils";

export const oracles = (network: any): any => network === NETWORKS.MAINNET ? {
    SaucerSwap: '0xc47037963fad3a5397cca3fef5c1c95839dc6363',
    Pangolin: '0xfa7206b4c9d46af2e2f7f3b1bd4d3aa2aeca6e71',
    HeliSwap: '0x51851a39da39c53f9b564cfdf7e6f55dc8850225',
} : {
    SaucerSwap: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
    Pangolin: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
};

export const defaultOracleContracts = {
    SaucerSwap: null,
    Pangolin: null,
    HeliSwap: null,
};

export const defaultPrices = {
    SaucerSwap: null,
    Pangolin: null,
    HeliSwap: null,
    HSuite: null,
};

export const exchange = (network: any) => network === NETWORKS.MAINNET ? '0.0.3745835' : '0.0.1772118';

export const feeWallet = (network: any) => network === NETWORKS.MAINNET ? '0.0.3745833' : '0.0.1772102';

export const hSuiteApiKey = (network: any) => network === NETWORKS.MAINNET ? 'd5db1f4a-8791-4f12-925f-920754547ce7' : '25f54dd3-47a1-4667-b9d8-2863585bc460';


export const defaultTokens = (tokensMap: any) => ([...tokensMap]
    .map(wrap => wrap[1])
    .sort((a, b) =>
        a.providers.length > b.providers.length
            ? -1
            : (a.providers.length === b.providers.length
                    ? (a.name > b.name ? 1 : -1)
                    : 1
            )
    )
);

export const getSortedPrices = (prices: any, tokenOne: any, tokenTwo: any, tokenTwoAmount: any, tokenOneAmount: any, feeOnTransfer: any, network: any) => {
    const sortedPrices = Object.keys(prices)
        .filter(name => prices[name]?.rate && !prices[name]?.rate?.eq(0))
        .sort((a, b) => prices[b].rate.sub(prices[a].rate))
        .map(name => ({name, price: prices[name].rate, weight: prices[name].weight}));

    const bestPrice = sortedPrices?.[0]?.price;
    if (parseFloat(bestPrice) === 0) {
        return [];
    }
    const pricesRes = [];
    for (let {name, price, weight} of sortedPrices) {
        if (!price || !tokenOne?.decimals || !tokenTwo?.decimals || !oracleSettings(network)[name]) {
            continue;
        }

        const priceRes: any = {price, weight, name};

        const volume = weight.pow(2);
        const Va = sqrt(volume.mul(BigNumber.from(10).pow(18)).div(price));
        const Vb = volume.div(Va);

        if (feeOnTransfer) {
            const amountOut = BigNumber.from(ethers.utils.parseUnits(tokenTwoAmount.toString(), tokenTwo.decimals)).mul(1000 + oracleSettings(network)[name].feePromille + oracleSettings(network)[name].feeDEXPromille).div(1000);
            const VaAfter = amountOut.mul(Va).div(Vb.sub(amountOut));
            const priceImpact = amountOut.mul(10000).div(Vb);
            priceRes.amountOut = VaAfter;
            priceRes.priceImpact = priceImpact;
            if (VaAfter.gt(0)) {
                pricesRes.push(priceRes);
            }
        } else {
            const amountIn = BigNumber.from(ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals)).mul(1000 - oracleSettings(network)[name].feePromille - oracleSettings(network)[name].feeDEXPromille).div(1000);
            const VbAfter = amountIn.mul(Vb).div(Va.add(amountIn));
            const priceImpact = VbAfter.mul(10000).div(Vb);
            priceRes.amountOut = VbAfter;
            priceRes.priceImpact = priceImpact;
            pricesRes.push(priceRes);
        }

    }

    return pricesRes.sort((a: any, b: any) => feeOnTransfer ? a.amountOut.sub(b.amountOut) : b.amountOut.sub(a.amountOut));
}


export const swapTokens = async (tokenA: any, tokenB: any, hSuitePools: any, network: any, oracleContracts: any) => {
    const hSuitePool = hSuitePools[`${tokenA}_${tokenB}`] || hSuitePools[`${tokenB}_${tokenA}`] || null;

    const oraclePromises = [
        ...Object.keys(oracleContracts).map(async i => {
            let _tokenA = tokenA;
            let _tokenB = tokenB;
            if (tokenA === ethers.constants.AddressZero) {
                _tokenA = oracleSettings(network)[i].whbar;
            }
            if (tokenB === ethers.constants.AddressZero) {
                _tokenB = oracleSettings(network)[i].whbar;
            }
            return oracleContracts[i].getRate(_tokenA, _tokenB);
        }),
    ];
    if (hSuitePool) {
        oraclePromises.push(axios.get(`https://${network}.mirrornode.hedera.com/api/v1/accounts/${hSuitePool}`));
    }

    const res: any = await Promise.allSettled(oraclePromises);

    let hSuitePriceArr: any = null;
    if (res[network === NETWORKS.MAINNET ? 3 : 2]?.status === 'fulfilled') {
        const balance = res[network === NETWORKS.MAINNET ? 3 : 2].value.data.balance;
        let balanceA = 0;
        let balanceB = 0;
        if (tokenA === ethers.constants.AddressZero) {
            balanceA = balance.balance;
        } else {
            const idA = TokenId.fromSolidityAddress(tokenA).toString();
            balanceA = balance.tokens.find((token: any) => token.token_id === idA)?.balance;
        }
        if (tokenB === ethers.constants.AddressZero) {
            balanceB = balance.balance;
        } else {
            const idB = TokenId.fromSolidityAddress(tokenB).toString();
            balanceB = balance.tokens.find((token: any) => token.token_id === idB)?.balance;
        }

        hSuitePriceArr = [];
        hSuitePriceArr['rate'] = BigNumber.from(balanceB).mul(BigNumber.from('1000000000000000000')).div(BigNumber.from(balanceA));
        hSuitePriceArr['weight'] = sqrt(BigNumber.from(balanceA).mul(balanceB));
    }

    return {
        SaucerSwap: res[0].status === 'fulfilled' ? res[0].value : null,
        Pangolin: res[1].status === 'fulfilled' ? res[1].value : null,
        HeliSwap: network === NETWORKS.MAINNET ? (res[2]?.status === 'fulfilled' ? res[2].value : null) : null,
        HSuite: hSuitePriceArr,
    }
}


export const oracleSettings = (network: any): any => network === NETWORKS.MAINNET ? {
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
    HSuite: {
        icon: HSuiteLogo,
        aggregatorId: 'HSuite',
        feePromille: 3,
        feeDEXPromille: 3,
        whbar: '',
    },
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
