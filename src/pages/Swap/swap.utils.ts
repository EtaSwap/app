import {NETWORKS} from "../../utils/constants";
import {BigNumber, ethers} from "ethers";
import {sqrt} from "../../utils/utils";
import { Provider } from '../../class/providers/provider';

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

export const getSortedPrices = (prices: any, tokenOne: any, tokenTwo: any, tokenTwoAmount: any, tokenOneAmount: any, feeOnTransfer: any, network: any, providers: Record<string, Provider>) => {
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
        if (!price || !tokenOne?.decimals || !tokenTwo?.decimals) {// || !oracleSettings(network)[name]) {
            continue;
        }

        const priceRes: any = {price, weight, name};

        const volume = weight.pow(2);
        const Va = sqrt(volume.mul(BigNumber.from(10).pow(18)).div(price));
        const Vb = volume.div(Va);

        if (feeOnTransfer) {
            const amountOut = BigNumber.from(ethers.utils.parseUnits(tokenTwoAmount.toString(), tokenTwo.decimals)).mul(1000 + providers[name].feePromille + providers[name].feeDEXPromille).div(1000);
            const VaAfter = amountOut.mul(Va).div(Vb.sub(amountOut));
            const priceImpact = amountOut.mul(10000).div(Vb);
            priceRes.amountOut = VaAfter;
            priceRes.priceImpact = priceImpact;
            if (VaAfter.gt(0)) {
                pricesRes.push(priceRes);
            }
        } else {
            const amountIn = BigNumber.from(ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals)).mul(1000 - providers[name].feePromille - providers[name].feeDEXPromille).div(1000);
            const VbAfter = amountIn.mul(Vb).div(Va.add(amountIn));
            const priceImpact = VbAfter.mul(10000).div(Vb);
            priceRes.amountOut = VbAfter;
            priceRes.priceImpact = priceImpact;
            pricesRes.push(priceRes);
        }
    }

    return pricesRes.sort((a: any, b: any) => feeOnTransfer ? a.amountOut.sub(b.amountOut) : b.amountOut.sub(a.amountOut));
}


export const swapTokens = async (tokenA: any, tokenB: any, network: any, oracleContracts: any, providers: Record<string, Provider>) => {
    const res = await Promise.allSettled([
        oracleContracts.SaucerSwap ? providers.SaucerSwap.getPrice(tokenA, tokenB, network, oracleContracts.SaucerSwap) : null,
        oracleContracts.Pangolin ? providers.Pangolin.getPrice(tokenA, tokenB, network, oracleContracts.Pangolin) : null,
        !oracleContracts.HeliSwap || network === NETWORKS.TESTNET ? null : providers.HeliSwap.getPrice(tokenA, tokenB, network, oracleContracts.HeliSwap),
        providers.HSuite.getPrice(tokenA, tokenB, network, oracleContracts.HSuite),
    ]);

    return {
        SaucerSwap: res[0].status === 'fulfilled' ? res[0].value : null,
        Pangolin: res[1].status === 'fulfilled' ? res[1].value : null,
        HeliSwap: network === NETWORKS.TESTNET ? null : (res[2]?.status === 'fulfilled' ? res[2].value : null),
        HSuite: res[3].status === 'fulfilled' ? res[3].value : null,
    }
}
