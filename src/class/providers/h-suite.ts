import { Provider } from './provider';
import { Props } from './types/props';
import { Token } from '../../types/token';
import { HSuiteGetToken } from './types/tokens';
import { ContractId } from '@hashgraph/sdk';
// @ts-ignore
import HSuiteLogo from '../../assets/img/hsuite.png';

export class HSuite extends Provider {
    public icon = HSuiteLogo;
    public aggregatorId = this.constructor.name;
    public feePromille = 3;
    public feeDEXPromille = 3;

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
            providers: [this.aggregatorId],
        }
    }
}