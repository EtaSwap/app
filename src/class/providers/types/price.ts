import { BigNumber } from 'ethers';

export type PriceMirrorNodeResponse = {
    rate: BigNumber | null;
    weight: BigNumber | null;
}