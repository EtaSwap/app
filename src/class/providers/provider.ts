import { GetToken, GetTokensResponse } from './types/tokens';
import axios, { AxiosResponse } from 'axios';
import { Props } from './types/props';
import { Token } from '../../types/token';
import { Price } from './types/price';
import { BigNumber, ethers } from 'ethers';
import { PriceOutput } from './types/price-output';
import { SortedPrice } from './types/sorted-price';
import { sqrt } from '../../utils/utils';

export abstract class Provider {
    public abstract icon: string;
    public abstract aggregatorId: string;
    public abstract feePromille: number;
    public abstract feeDEXPromille: number;
    protected props: Props;
    protected constructor(props: Props) {
        this.props = props;
    }
    public getTokens(network: string): Promise<AxiosResponse<GetTokensResponse>> | null {
        if (!this.props[network].getTokensUrl) {
            return null;
        }
         return axios.get(this.props[network].getTokensUrl!);
    };

    abstract mapProviderTokenToToken(providerToken: GetToken): Token;

    public getWHBAR(network: string): string | null {
        return this.props[network].whbar;
    }

    public getOracle(network: string): any | null {
        return this.props[network].oracle;
    }

    public getApiKey(network: string): string | null {
        return null;
    }

    public getPrice(tokenA: string, tokenB: string, network: string, oracleContract: any): Promise<Price> | null {
        let _tokenA = tokenA;
        let _tokenB = tokenB;
        if (tokenA === ethers.constants.AddressZero) {
            _tokenA = this.getWHBAR(network)!;
        }
        if (tokenB === ethers.constants.AddressZero) {
            _tokenB = this.getWHBAR(network)!;
        }
        return oracleContract.getRate(_tokenA, _tokenB);
    }

    public getPriceOutput(
        sortedPrice: SortedPrice,
        tokenOne: Token,
        tokenTwo: Token,
        tokenOneAmount: BigNumber,
        tokenTwoAmount: BigNumber,
        feeOnTransfer: boolean,
        network?: string,
    ): Promise<PriceOutput | null> {
        const { price, name, weight } = sortedPrice;
        const priceRes: PriceOutput = { price, weight: weight!, name, priceImpact: BigNumber.from(0), amountOut: BigNumber.from(0) };
        const volume = weight!.pow(2);
        const Va = sqrt(volume.mul(BigNumber.from(10).pow(18)).div(price));
        const Vb = volume.div(Va);

        if (feeOnTransfer) {
            const amountOut = BigNumber.from(ethers.utils.parseUnits(tokenTwoAmount.toString(), tokenTwo.decimals)).mul(1000 + this.feePromille + this.feeDEXPromille).div(1000);
            const VaAfter = amountOut.mul(Va).div(Vb.sub(amountOut));
            const priceImpact = amountOut.mul(10000).div(Vb);
            priceRes.amountOut = VaAfter;
            priceRes.priceImpact = priceImpact;
            if (VaAfter.gt(0)) {
                return Promise.resolve(priceRes);
            }
        } else {
            const amountIn = BigNumber.from(ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals)).mul(1000 - this.feePromille - this.feeDEXPromille).div(1000);
            const VbAfter = amountIn.mul(Vb).div(Va.add(amountIn));
            const priceImpact = VbAfter.mul(10000).div(Vb);
            priceRes.amountOut = VbAfter;
            priceRes.priceImpact = priceImpact;
            return Promise.resolve(priceRes);
        }

        return Promise.resolve(null);
    }
}