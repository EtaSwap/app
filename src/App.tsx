import "./App.css";
import React, {useState, useEffect} from 'react';
import Header from "./components/Header/Header";
import {Routes, Route, Navigate} from "react-router-dom";
import Swap from "./pages/Swap/Swap";
import Tokens from "./pages/Tokens/Tokens";
import axios, {AxiosResponse} from 'axios';
import {AccountId, ContractId} from '@hashgraph/sdk';
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

function App() {
    const [wallet, setWallet] = useState<IWallet>({
        name: '',
        address: '',
        signer: null,
    });
    const [tokens, setTokens] = useState<Map<string, IToken>>(new Map());
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

    useEffect(() => {
        wallets.hashpack.instance.connect(network, true);
        axios.get('https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate').then(rate => {
            setRate(rate.data.current_rate.hbar_equivalent / rate.data.current_rate.cent_equivalent * 100);
        });
    }, []);

    useEffect(() => {
        let tokenSources: (Promise<AxiosResponse> | null)[] = [
            axios.get('https://api.saucerswap.finance/tokens'),
            axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
            axios.get('https://heliswap.infura-ipfs.io/ipfs/Qmf5u6N2ohZnBc1yxepYzS3RYagkMZbU5dwwU4TGxXt9Lf'),
            axios.get('https://mainnet-sn1.hbarsuite.network/tokens/list'),
            axios.get('https://mainnet-sn1.hbarsuite.network/pools/list'),
        ];
        let tokenList = new Set(tokenListMainnet);
        if (network === NETWORKS.TESTNET) {
            tokenSources = [
                axios.get('https://test-api.saucerswap.finance/tokens'),
                axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
                null,
                axios.get('https://testnet-sn1.hbarsuite.network/tokens/list'),
                axios.get('https://testnet-sn1.hbarsuite.network/pools/list'),
            ];
            tokenList = new Set(tokenListTestnet);
        }
        Promise.all(tokenSources).then(([
                                            saucerSwapTokens,
                                            pangolinTokens,
                                            heliswapTokens,
                                            hsuiteTokens,
                                            hsuitePools,
                                        ]: (AxiosResponse | null)[]) => {
            const tokenMap = new Map();
            const providers = ['SaucerSwap', 'Pangolin', 'HeliSwap', 'HSuite'];
            tokenMap.set(ethers.constants.AddressZero, {
                name: 'Hbar',
                symbol: 'HBAR',
                decimals: 8,
                address: '',
                solidityAddress: ethers.constants.AddressZero,
                icon: HederaLogo,
                providers,
            });

            if(saucerSwapTokens){
                saucerSwapTokens.data.map((token: IToken) => {
                    const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`.toLowerCase();
                    if (tokenList.has(token.id)) {
                        tokenMap.set(solidityAddress, {
                            name: token.name,
                            symbol: token.symbol,
                            decimals: token.decimals,
                            address: token.id,
                            solidityAddress,
                            icon: token.icon ? `https://www.saucerswap.finance/${token.icon?.replace(/^\//, '')}` : '',
                            providers: ['SaucerSwap'],
                        });
                    }
                });
            }

            if(pangolinTokens){
                pangolinTokens.data.tokens.filter((token: IToken) => token.chainId === (network === NETWORKS.MAINNET ? 295 : 296)).map((token: IToken) => {
                    const existing = tokenMap.get(token.address.toLowerCase());
                    if (existing) {
                        existing.providers.push('Pangolin');
                    } else if (tokenList.has(ContractId.fromSolidityAddress(token.address).toString())) {
                        tokenMap.set(token.address.toLowerCase(), {
                            name: token.name,
                            symbol: token.symbol,
                            decimals: token.decimals,
                            address: ContractId.fromSolidityAddress(token.address).toString(),
                            solidityAddress: token.address,
                            icon: token.logoURI || '',
                            providers: ['Pangolin'],
                            dueDiligenceComplete: false,
                        });
                    }
                });
            }

            if (heliswapTokens?.data?.tokens) {
                heliswapTokens.data.tokens.map((token: IToken) => {
                    const existing = tokenMap.get(token.address.toLowerCase());
                    if (existing) {
                        existing.providers.push('HeliSwap');
                    } else if (tokenList.has(ContractId.fromSolidityAddress(token.address).toString())) {
                        tokenMap.set(token.address.toLowerCase(), {
                            name: token.name,
                            symbol: token.symbol,
                            decimals: token.decimals,
                            address: ContractId.fromSolidityAddress(token.address).toString(),
                            solidityAddress: token.address,
                            icon: token.logoURI || '',
                            providers: ['HeliSwap'],
                            dueDiligenceComplete: false,
                        });
                    }
                });
            }

            if (hsuiteTokens?.data) {
                hsuiteTokens.data.map((token: IToken) => {
                    if (token.id !== typeWallet.HBAR) {
                        const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`.toLowerCase();
                        const existing = tokenMap.get(solidityAddress);
                        if (existing) {
                            existing.providers.push('HSuite');
                        } else if (tokenList.has(token.id)) {
                            tokenMap.set(solidityAddress, {
                                name: token.name,
                                symbol: token.symbol,
                                decimals: token.decimals,
                                address: token.id,
                                solidityAddress,
                                icon: token.image ? decodeURIComponent(token.image) : '',
                                providers: ['HSuite'],
                                dueDiligenceComplete: false,
                            });
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
                            rate={rate} />
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
