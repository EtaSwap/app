import { Provider } from './provider';
import { AggregatorId, Props } from './types/props';
import { Token } from '../../types/token';
import { GetTokensResponse, HSuiteGetToken } from './types/tokens';
import { ContractId, TokenId } from '@hashgraph/sdk';
// @ts-ignore
import HSuiteLogo from '../../assets/img/hsuite.png';
import { HSUITE_API_KEY } from '../../config';
import axios, { AxiosResponse } from 'axios';

export class HSuite extends Provider {
    public icon = HSuiteLogo;
    public aggregatorId = AggregatorId.HSuite;
    public feePromille = 3;
    public feeDEXPromille = 3;

    constructor(props: Props) {
        super(props);
    }

    public getTokens(network: string): Promise<AxiosResponse<GetTokensResponse>> | null {
        if (!this.props.getTokensUrl) {
            return null;
        }
        const abortController = new AbortController();
        setTimeout(() => abortController.abort(), 6000);
        return Promise.any([
            axios.get(this.props.getTokensUrl.replace('%NODE_ID%', '2'), { signal: abortController.signal }),
            axios.get(this.props.getTokensUrl.replace('%NODE_ID%', '4'), { signal: abortController.signal }),
            axios.get(this.props.getTokensUrl.replace('%NODE_ID%', '7'), { signal: abortController.signal }),
            axios.get(this.props.getTokensUrl.replace('%NODE_ID%', '8'), { signal: abortController.signal }),
        ]);
    };

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

    public getApiKey(): string {
        return HSUITE_API_KEY;
    }
}