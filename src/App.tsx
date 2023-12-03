import "./App.css";
import React, {useState, useEffect} from 'react';
import Header from "./components/Header/Header";
import axios, {AxiosResponse} from 'axios';
import { AccountId, ContractId } from '@hashgraph/sdk';
import {ethers} from 'ethers';
// @ts-ignore
import HederaLogo from './assets/img/hedera-logo.png';
// @ts-ignore
import HashpackLogo from './assets/img/hashpack.svg';
// @ts-ignore
import HashpackIcon from './assets/img/hashpack-icon.png';
// @ts-ignore
import BladeLogo from './assets/img/blade.svg';
// @ts-ignore
import BladeIcon from './assets/img/blade-icon.webp';
import tokenListMainnet from './tokenListMainnet.json';
import tokenListTestnet from './tokenListTestnet.json';
import {HashpackWallet} from './class/wallet/hashpack-wallet';
import {BladeWallet} from './class/wallet/blade-wallet';
import {NETWORKS} from './utils/constants';
import Social from './components/Social/Social';
import pkg from '../package.json';
import {LoaderProvider} from "./components/Loader/LoaderContext";
import {ToasterProvider} from "./components/Toaster/ToasterContext";
import {ToastContainer} from "react-toastify";
import {IHSuitePool, IToken, IWallet, IWallets, typeWallet} from "./Models";
import AppRouter from "./router";
import { SaucerSwap } from './class/providers/saucer-swap';
import { Pangolin } from './class/providers/pangolin';
import { HeliSwap } from './class/providers/heli-swap';
import { HSuite } from './class/providers/h-suite';
import { Token } from './types/token';
import { HeliSwapGetToken, HSuiteGetToken, PangolinGetToken, SaucerSwapGetToken } from './class/providers/types/tokens';

function App() {
    const [wallet, setWallet] = useState<IWallet>({
        name: '',
        address: '',
        signer: null,
    });
    const [tokens, setTokens] = useState<Map<string, Token>>(new Map());
    const [network, setNetwork] = useState(NETWORKS.MAINNET);
    const [hSuitePools, setHSuitePools] = useState({});
    const [rate, setRate] = useState<number | null>(null);

    const [wallets] = useState<IWallets>({
        hashpack: {
            name: 'hashpack',
            title: 'HashPack',
            instance: new HashpackWallet(setWallet),
            image: HashpackLogo,
            icon: HashpackIcon,
        },
        blade: {
            name: 'blade',
            title: 'Blade',
            instance: new BladeWallet(setWallet),
            image: BladeLogo,
            icon: BladeIcon,
        },
    });
    const [providers] = useState({
        SaucerSwap: new SaucerSwap({
            mainnet: {
                getTokensUrl: 'https://api.saucerswap.finance/tokens',
                whbar: '0x0000000000000000000000000000000000163b5a',
                oracle: '0xc47037963fad3a5397cca3fef5c1c95839dc6363',
            },
            testnet: {
                getTokensUrl: 'https://test-api.saucerswap.finance/tokens',
                whbar: '0x000000000000000000000000000000000000e6a2',
                oracle: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
            }
        }),
        Pangolin: new Pangolin({
            mainnet: {
                getTokensUrl: 'https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json',
                whbar: '0x00000000000000000000000000000000001a8837',
                oracle: '0xfa7206b4c9d46af2e2f7f3b1bd4d3aa2aeca6e71',
            },
            testnet: {
                getTokensUrl: 'https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json',
                whbar: '0x000000000000000000000000000000000002690a',
                oracle: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
            }
        }),
        HeliSwap: new HeliSwap({
            mainnet: {
                getTokensUrl: 'https://heliswap.infura-ipfs.io/ipfs/Qmf5u6N2ohZnBc1yxepYzS3RYagkMZbU5dwwU4TGxXt9Lf',
                whbar: '0x00000000000000000000000000000000002cc823',
                oracle: '0x51851a39da39c53f9b564cfdf7e6f55dc8850225',
            },
            testnet: {
                getTokensUrl: null,
                whbar: null,
                oracle: null,
            }
        }),
        HSuite: new HSuite({
            mainnet: {
                getTokensUrl: 'https://mainnet-sn1.hbarsuite.network/tokens/list',
                whbar: null,
                oracle: null,
            },
            testnet: {
                getTokensUrl: 'https://testnet-sn1.hbarsuite.network/tokens/list',
                whbar: null,
                oracle: null,
            }
        }),
    });

    useEffect(() => {
        wallets.hashpack.instance.connect(network, true);
        axios.get('https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate').then(rate => {
            setRate(rate.data.current_rate.hbar_equivalent / rate.data.current_rate.cent_equivalent * 100);
        });
    }, []);

    useEffect(() => {
        const tokenPromises = Object.values(providers).map(provider => provider.getTokens(network));
        const tokenList = new Set(network === NETWORKS.TESTNET ? tokenListTestnet : tokenListMainnet);
        tokenPromises.push(
            network === NETWORKS.TESTNET
            ? axios.get('https://testnet-sn1.hbarsuite.network/pools/list')
            : axios.get('https://mainnet-sn1.hbarsuite.network/pools/list'),
        );

        Promise.all(tokenPromises).then(([
            saucerSwapTokens,
            pangolinTokens,
            heliswapTokens,
            hsuiteTokens,
            hsuitePools,
        ]: (AxiosResponse | null)[]) => {
            const tokenMap: Map<string, Token> = new Map();
            const providerNames: string[] = Object.values(providers).map(provider => provider.constructor.name);
            tokenMap.set(ethers.constants.AddressZero, {
                name: 'Hbar',
                symbol: 'HBAR',
                decimals: 8,
                address: '',
                solidityAddress: ethers.constants.AddressZero,
                icon: HederaLogo,
                providers: providerNames,
            });

            if(saucerSwapTokens){
                saucerSwapTokens.data.map((token: SaucerSwapGetToken) => {
                    const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`.toLowerCase();
                    if (tokenList.has(token.id)) {
                        tokenMap.set(solidityAddress, providers.SaucerSwap.mapProviderTokenToToken(token));
                    }
                });
            }

            if(pangolinTokens){
                pangolinTokens.data.tokens
                    .filter((token: PangolinGetToken) => token.chainId === (network === NETWORKS.MAINNET ? 295 : 296))
                    .map((token: PangolinGetToken) => {
                    const existing = tokenMap.get(token.address.toLowerCase());
                    if (existing) {
                        existing.providers.push(providers.Pangolin.constructor.name);
                    } else if (tokenList.has(ContractId.fromSolidityAddress(token.address).toString())) {
                        tokenMap.set(token.address.toLowerCase(), providers.Pangolin.mapProviderTokenToToken(token));
                    }
                });
            }

            if (heliswapTokens?.data?.tokens) {
                heliswapTokens.data.tokens.map((token: HeliSwapGetToken) => {
                    const existing = tokenMap.get(token.address.toLowerCase());
                    if (existing) {
                        existing.providers.push(providers.HeliSwap.constructor.name);
                    } else if (tokenList.has(ContractId.fromSolidityAddress(token.address).toString())) {
                        tokenMap.set(token.address.toLowerCase(), providers.HeliSwap.mapProviderTokenToToken(token));
                    }
                });
            }

            if (hsuiteTokens?.data) {
                hsuiteTokens.data.map((token: HSuiteGetToken) => {
                    if (token.id !== typeWallet.HBAR) {
                        const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`.toLowerCase();
                        const existing = tokenMap.get(solidityAddress);
                        if (existing) {
                            existing.providers.push(providers.HSuite.constructor.name);
                        } else if (tokenList.has(token.id)) {
                            tokenMap.set(solidityAddress, providers.HSuite.mapProviderTokenToToken(token));
                        }
                    }
                });
            }

            setTokens(tokenMap);

            const _hSuitePools: IHSuitePool[] = [];
            hsuitePools?.data?.forEach((pool: IHSuitePool) => {
                const token1Addr = pool.tokens.base.id !== typeWallet.HBAR
                    ? `0x${AccountId.fromString(pool.tokens.base.id).toSolidityAddress()}`.toLowerCase()
                    : ethers.constants.AddressZero;
                const token2Addr = pool.tokens.swap.id !== typeWallet.HBAR
                    ? `0x${AccountId.fromString(pool.tokens.swap.id).toSolidityAddress()}`.toLowerCase()
                    : ethers.constants.AddressZero;
                // @ts-ignore
                _hSuitePools[`${token1Addr}_${token2Addr}`] = pool.walletId;
            });
            setHSuitePools(_hSuitePools);
        });
    }, [network]);

    return (
        <div className="App">
            <LoaderProvider>
                <ToasterProvider>
                    <Header
                        wallet={wallet}
                        wallets={wallets}
                        network={network}
                        setNetwork={setNetwork}
                    />
                    <div className="mainWindow">
                        <AppRouter
                            wallet={wallet}
                            tokens={tokens}
                            network={network}
                            hSuitePools={hSuitePools}
                            rate={rate}
                            providers={providers}
                        />
                    </div>
                    <div className="social">
                        <Social/>
                    </div>
                    <div className="version">v {pkg.version}</div>

                    <ToastContainer />
                </ToasterProvider>
            </LoaderProvider>
        </div>
    )
}

export default App;
