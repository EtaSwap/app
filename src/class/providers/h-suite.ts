import { Provider } from './provider';
import { Props } from './types/props';
import { Token } from '../../types/token';
import { HSuiteGetToken } from './types/tokens';
import { ContractId, TokenId } from '@hashgraph/sdk';
// @ts-ignore
import HSuiteLogo from '../../assets/img/hsuite.png';
import { NETWORKS } from '../../utils/constants';
import { PriceMirrorNodeResponse } from './types/price';
import { BigNumber, ethers } from 'ethers';
import axios from 'axios';
import { IToken } from '../../Models';
import { sqrt } from '../../utils/utils';

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

    public getApiKey(network: string): string {
        if (network === NETWORKS.TESTNET) {
            return '25f54dd3-47a1-4667-b9d8-2863585bc460';
        }
        return 'd5db1f4a-8791-4f12-925f-920754547ce7';
    }

    public getPrice(tokenA: string, tokenB: string, network: string): Promise<PriceMirrorNodeResponse> {
        let rate = '0';
        let weight = '0';
        // const hSuitePool = hSuitePools[`${tokenA}_${tokenB}`] || hSuitePools[`${tokenB}_${tokenA}`] || null;
        // if (hSuitePool) {
        //     oraclePromises.push(axios.get(`https://${network}.mirrornode.hedera.com/api/v1/accounts/${hSuitePool}`));
        //     const balance = res[network === NETWORKS.MAINNET ? 3 : 2].value.data.balance;
        //     let balanceA = 0;
        //     let balanceB = 0;
        //     if (tokenA === ethers.constants.AddressZero) {
        //         balanceA = balance.balance;
        //     } else {
        //         const idA = TokenId.fromSolidityAddress(tokenA).toString();
        //         balanceA = balance.tokens.find((token: IToken) => token.token_id === idA)?.balance;
        //     }
        //     if (tokenB === ethers.constants.AddressZero) {
        //         balanceB = balance.balance;
        //     } else {
        //         const idB = TokenId.fromSolidityAddress(tokenB).toString();
        //         balanceB = balance.tokens.find((token: IToken) => token.token_id === idB)?.balance;
        //     }
        //
        //     hSuitePriceArr = [];
        //     hSuitePriceArr['rate'] = BigNumber.from(balanceB).mul(BigNumber.from('1000000000000000000')).div(BigNumber.from(balanceA));
        //     hSuitePriceArr['weight'] = sqrt(BigNumber.from(balanceA).mul(balanceB));
        // }
        return Promise.resolve({
            rate,
            weight,
        });
    }
}