import { BigNumber } from 'ethers';

export type PriceOutputExtension = {
    title: string;
    value: string;
}

export type PriceOutput = {
    //input
    name: string;
    weight: BigNumber;
    price: BigNumber;

    //output
    priceImpact: BigNumber;
    amountOut: BigNumber;
    extensions?: PriceOutputExtension[];
}