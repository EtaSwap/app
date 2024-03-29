import { Provider } from './provider';
import { Props } from './types/props';
import { SaucerSwapGetToken } from './types/tokens';
import { Token } from '../../types/token';
import { ContractId } from '@hashgraph/sdk';
// @ts-ignore
import SaucerSwapLogo from '../../assets/img/saucerswap.ico';

export class SaucerSwap extends Provider {
    public icon = SaucerSwapLogo;
    public aggregatorId = 'SaucerSwap';
    public feePromille = 3;
    public feeDEXPromille = 3;

    constructor(props: Props) {
        super(props);
    }

    public mapProviderTokenToToken(providerToken: SaucerSwapGetToken): Token {
        const solidityAddress = `0x${ContractId.fromString(providerToken.id).toSolidityAddress()}`.toLowerCase();
        return {
            name: providerToken.symbol,
            symbol: providerToken.symbol,
            decimals: providerToken.decimals,
            address: providerToken.id,
            solidityAddress,
            icon: providerToken.icon ? `https://www.saucerswap.finance/${providerToken.icon?.replace(/^\//, '')}` : '',
            providers: [this.aggregatorId],
        }
    }
}