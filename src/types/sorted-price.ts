import { BigNumber } from 'ethers';
import { AggregatorId } from '../class/providers/types/props';

export enum TransactionType {
    SWAP = 'SWAP',
    INDIRECT_SWAP = 'INDIRECT_SWAP',
    SPLIT_SWAP = 'SPLIT_SWAP',
}

export type SortedPrice = {
    //output
    transactionType: TransactionType,
    aggregatorId: AggregatorId,
    path: string;
    amountIn: BigNumber;
    amountOut: BigNumber;
    priceImpact: number;
    gasEstimate: number;
    route: string[];
}