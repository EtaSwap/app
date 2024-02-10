import { BigNumber } from 'ethers';

export type PriceOutput = {
    //input
    name: string;
    weight: BigNumber;
    price: BigNumber;

    //output
    priceImpact: BigNumber;
    amountOut: BigNumber;
    extension?: string;
}