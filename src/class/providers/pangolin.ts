import { Provider } from './provider';
import { Props } from './types/props';
import { PangolinGetToken } from './types/tokens';
import { Token } from '../../types/token';
import { ContractId } from '@hashgraph/sdk';

export class Pangolin extends Provider {
    constructor(props: Props) {
        super(props);
    }

    public mapProviderTokenToToken(providerToken: PangolinGetToken): Token {
        return {
            name: providerToken.name,
            symbol: providerToken.symbol,
            decimals: providerToken.decimals,
            address: ContractId.fromSolidityAddress(providerToken.address).toString(),
            solidityAddress: providerToken.address,
            icon: providerToken.logoURI || '',
            providers: [this.constructor.name],
        }
    }
}