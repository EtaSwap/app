import { GetToken, GetTokensResponse } from './types/tokens';
import axios, { AxiosResponse } from 'axios';
import { Props } from './types/props';
import { Token } from '../../types/token';

export abstract class Provider {
    props: Props;
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
}