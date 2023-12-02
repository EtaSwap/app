import { Provider } from './provider';
import { Props } from './types/props';
import { Token } from '../../types/token';
import { HSuiteGetToken } from './types/tokens';
import { ContractId } from '@hashgraph/sdk';

export class HSuite extends Provider {
    constructor(props: Props) {
        super(props);
    }

    public mapProviderTokenToToken(providerToken: HSuiteGetToken): Token {
        const solidityAddress = `0x${ContractId.fromString(providerToken.id).toSolidityAddress()}`.toLowerCase();
        return {
            name: providerToken.name,
            symbol: providerToken.symbol,
            decimals: providerToken.decimals,
            address: providerToken.id,
            solidityAddress,
            icon: providerToken.image ? decodeURIComponent(providerToken.image) : '',
            providers: [this.constructor.name],
        }
    }
}