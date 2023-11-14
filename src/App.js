import "./App.css";
import React, { useState, useEffect } from 'react';
import Header from "./components/Header";
import { Routes, Route, Navigate } from "react-router-dom";
import Swap from "./components/Swap";
import Tokens from "./components/Tokens";
import axios from 'axios';
import { AccountId, ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import HederaLogo from './img/hedera-logo.png';
import HashpackLogo from './img/hashpack.svg';
import HashpackIcon from './img/hashpack-icon.png';
import BladeLogo from './img/blade.svg';
import BladeIcon from './img/blade-icon.webp';
import tokenListMainnet from './tokenListMainnet.json';
import tokenListTestnet from './tokenListTestnet.json';
import { HashpackWallet } from './class/wallet/hashpack-wallet';
import { BladeWallet } from './class/wallet/blade-wallet';
import { NETWORKS } from './constants';
import Social from './components/Social';
import pkg from '../package.json';

function App() {
    const [wallet, setWallet] = useState({
        name: '',
        address: '',
        signer: null,
    });
    const [tokens, setTokens] = useState(new Map());
    const [network, setNetwork] = useState(NETWORKS.TESTNET);
    const [hSuitePools, setHSuitePools] = useState({});

    const [wallets, setWallets] = useState({
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
    }, []);

    useEffect(() => {
        let tokenSources = [
            axios.get('https://api.saucerswap.finance/tokens'),
            axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
            axios.get('https://heliswap.infura-ipfs.io/ipfs/Qmf5u6N2ohZnBc1yxepYzS3RYagkMZbU5dwwU4TGxXt9Lf'),
            //TODO: replace for mainnet
            axios.get('https://testnet-sn1.hbarsuite.network/tokens/list'),
            axios.get('https://testnet-sn1.hbarsuite.network/pools/list'),
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
        ]) => {
            const tokenMap = new Map();
            tokenMap.set(ethers.constants.AddressZero, {
                name: 'Hbar',
                symbol: 'HBAR',
                decimals: 8,
                address: '',
                solidityAddress: ethers.constants.AddressZero,
                icon: HederaLogo,
                providers: ['SaucerSwap', 'Pangolin', 'HeliSwap', 'HSuite'],
            });

            saucerSwapTokens.data.map(token => {
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

            pangolinTokens.data.tokens.filter(token => token.chainId === (network === NETWORKS.MAINNET ? 295 : 296)).map(token => {
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

            if (heliswapTokens?.data?.tokens) {
                heliswapTokens.data.tokens.map(token => {
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
                hsuiteTokens.data.map(token => {
                    if (token.id !== 'HBAR') {
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

            const _hSuitePools = {};
            hsuitePools?.data?.forEach(pool => {
                const token1Addr = pool.tokens.base.id !== 'HBAR'
                    ? `0x${AccountId.fromString(pool.tokens.base.id).toSolidityAddress()}`.toLowerCase()
                    : ethers.constants.AddressZero;
                const token2Addr = pool.tokens.swap.id !== 'HBAR'
                    ? `0x${AccountId.fromString(pool.tokens.swap.id).toSolidityAddress()}`.toLowerCase()
                    : ethers.constants.AddressZero;
                _hSuitePools[`${token1Addr}_${token2Addr}`] = pool.walletId;
            });
            setHSuitePools(_hSuitePools);
        });
    }, [network]);

    return (
        <div className="App">
            <Header
                wallet={wallet}
                wallets={wallets}
                network={network}
                setNetwork={setNetwork}
            />
            <div className="mainWindow">
                <Routes>
                    <Route path="/" element={
                        <Swap
                            wallet={wallet}
                            tokens={tokens}
                            network={network}
                            hSuitePools={hSuitePools}
                        />
                    }/>
                    <Route path="/tokens" element={<Tokens tokens={tokens}/>}/>
                </Routes>
            </div>
            <div className="social">
                <Social/>
            </div>
            <div className="version">v {pkg.version}</div>
        </div>
    )
}

export default App;
