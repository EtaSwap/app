import "./App.css";
import React, { useState, useEffect } from 'react';
import Header from "./components/Header/Header";
import axios, { AxiosResponse } from 'axios';
import { ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
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
import { HashpackWallet } from './class/wallet/hashpack-wallet';
import { BladeWallet } from './class/wallet/blade-wallet';
import { NETWORKS } from './utils/constants';
import Social from './components/Social/Social';
import pkg from '../package.json';
import { LoaderProvider } from "./components/Loader/LoaderContext";
import { ToasterProvider, useToaster } from "./components/Toaster/ToasterContext";
import { ToastContainer } from "react-toastify";
import { IWallet, IWallets, typeWallet } from "./models";
import AppRouter from "./router";
import { SaucerSwap } from './class/providers/saucer-swap';
import { Pangolin } from './class/providers/pangolin';
import { HeliSwap } from './class/providers/heli-swap';
import { HSuite } from './class/providers/h-suite';
import { Token } from './types/token';
import { HeliSwapGetToken, HSuiteGetToken, PangolinGetToken, SaucerSwapGetToken } from './class/providers/types/tokens';
import { heliSwapDefault, hsuitDefault, pangolinDefault, saucerMapDefault } from "./app.utils";
import { toastTypes } from './models/Toast';

function App() {
    const [wallet, setWallet] = useState<IWallet>({
        name: '',
        address: '',
        signer: null,
    });
    const [tokens, setTokens] = useState<Map<string, Token>>(new Map());
    const [network, setNetwork] = useState(NETWORKS.MAINNET);
    const [rate, setRate] = useState<number | null>(null);
    const { showToast } = useToaster();

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
        SaucerSwap: new SaucerSwap(saucerMapDefault),
        Pangolin: new Pangolin(pangolinDefault),
        HeliSwap: new HeliSwap(heliSwapDefault),
        HSuite: new HSuite(hsuitDefault),
    });

    const showFallbackToast = (exchangeName: string) => {
        showToast('Fetch error', `Error loading token list from ${exchangeName}`, toastTypes.warning);
    }

    useEffect(() => {
        wallets.hashpack.instance.connect(network, true);
        axios.get('https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate').then(rate => {
            setRate(rate.data.current_rate.hbar_equivalent / rate.data.current_rate.cent_equivalent * 100);
        });
    }, []);

    useEffect(() => {
        const tokenPromises = Object.values(providers).map(provider => provider.getTokens(network));
        const tokenList = new Set(network === NETWORKS.TESTNET ? tokenListTestnet : tokenListMainnet);

        Promise.allSettled(tokenPromises).then(([
                                                    saucerSwapTokens,
                                                    pangolinTokens,
                                                    heliswapTokens,
                                                    hsuiteTokens,
                                                ]: PromiseSettledResult<any>[]) => {
            const tokenMap: Map<string, Token> = new Map();
            const hbarProviders: string[] = [];


            if (saucerSwapTokens.status === 'fulfilled') {
                hbarProviders.push(providers.SaucerSwap.aggregatorId);
                saucerSwapTokens.value.data.map((token: SaucerSwapGetToken) => {
                    const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`.toLowerCase();
                    if (tokenList.has(token.id)) {
                        tokenMap.set(solidityAddress, providers.SaucerSwap.mapProviderTokenToToken(token));
                    }
                });
            } else {
                showFallbackToast(providers.SaucerSwap.aggregatorId);
            }

            if (pangolinTokens.status === 'fulfilled') {
                hbarProviders.push(providers.Pangolin.aggregatorId);
                pangolinTokens.value.data.tokens
                    .filter((token: PangolinGetToken) => token.chainId === (network === NETWORKS.MAINNET ? 295 : 296))
                    .map((token: PangolinGetToken) => {
                        const existing = tokenMap.get(token.address.toLowerCase());
                        if (existing) {
                            existing.providers.push(providers.Pangolin.aggregatorId);
                        } else if (tokenList.has(ContractId.fromSolidityAddress(token.address).toString())) {
                            tokenMap.set(token.address.toLowerCase(), providers.Pangolin.mapProviderTokenToToken(token));
                        }
                    });
            } else {
                showFallbackToast(providers.Pangolin.aggregatorId);
            }

            if (heliswapTokens.status === 'fulfilled') {
                hbarProviders.push(providers.HeliSwap.aggregatorId);
                heliswapTokens.value.data?.tokens?.map((token: HeliSwapGetToken) => {
                    const existing = tokenMap.get(token.address.toLowerCase());
                    if (existing) {
                        existing.providers.push(providers.HeliSwap.aggregatorId);
                    } else if (tokenList.has(ContractId.fromSolidityAddress(token.address).toString())) {
                        tokenMap.set(token.address.toLowerCase(), providers.HeliSwap.mapProviderTokenToToken(token));
                    }
                });
            } else {
                showFallbackToast(providers.HeliSwap.aggregatorId);
            }

            if (hsuiteTokens.status === 'fulfilled') {
                hbarProviders.push(providers.HSuite.aggregatorId);
                hsuiteTokens.value?.data?.map((token: HSuiteGetToken) => {
                    if (token.id !== typeWallet.HBAR && token.type !== 'NON_FUNGIBLE_UNIQUE') {
                        const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`.toLowerCase();
                        const existing = tokenMap.get(solidityAddress);
                        if (existing) {
                            existing.providers.push(providers.HSuite.aggregatorId);
                        } else if (tokenList.has(token.id)) {
                            tokenMap.set(solidityAddress, providers.HSuite.mapProviderTokenToToken(token));
                        }
                    }
                });
            } else {
                showFallbackToast(providers.HSuite.aggregatorId);
            }

            tokenMap.set(ethers.constants.AddressZero, {
                name: 'Hbar',
                symbol: 'HBAR',
                decimals: 8,
                address: '',
                solidityAddress: ethers.constants.AddressZero,
                icon: HederaLogo,
                providers: hbarProviders,
            });

            setTokens(tokenMap);
        });
    }, [network]);


    return (
        <div className="App">
            <LoaderProvider>
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
                        rate={rate}
                        providers={providers}
                    />
                </div>
                <div className="social">
                    <Social/>
                </div>
                <div className="version">v {pkg.version}</div>

            </LoaderProvider>
        </div>
    )
}

export default App;
