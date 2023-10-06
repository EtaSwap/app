import "./App.css";
import React, { useState, useEffect } from 'react';
import Header from "./components/Header";
import { Routes, Route } from "react-router-dom";
import Swap from "./components/Swap";
import Tokens from "./components/Tokens";
import axios from 'axios';
import { ContractId } from '@hashgraph/sdk';
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

function App() {
    const [wallet, setWallet] = useState({
        name: '',
        address: '',
        signer: null,
    });
    const [tokens, setTokens] = useState(new Map());
    const [network, setNetwork] = useState(NETWORKS.MAINNET);

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
        ];
        let tokenList = new Set(tokenListMainnet);
        if (network === NETWORKS.TESTNET) {
            tokenSources = [
                axios.get('https://test-api.saucerswap.finance/tokens'),
                axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
            ];
            tokenList = new Set(tokenListTestnet);
        }
        Promise.all(tokenSources).then(([
            saucerSwapTokens,
            pangolinTokens,
            heliswapTokens,
        ]) => {
            const tokenMap = new Map();
            tokenMap.set(ethers.constants.AddressZero, {
                name: 'Hbar',
                symbol: 'HBAR',
                decimals: 8,
                address: '',
                solidityAddress: ethers.constants.AddressZero,
                icon: HederaLogo,
                providers: ['SaucerSwap', 'Pangolin', 'HeliSwap'],
            });

            saucerSwapTokens.data.map(token => {
                const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`;
                if (tokenList.has(token.id)) {
                    tokenMap.set(solidityAddress.toLowerCase(), {
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
            setTokens(tokenMap);
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
                        />
                    }/>
                    <Route path="/tokens" element={<Tokens tokens={tokens} network={network}/>}/>
                </Routes>
            </div>
        </div>
    )
}

export default App;
