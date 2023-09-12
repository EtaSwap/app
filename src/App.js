import "./App.css";
import React, { useState, useEffect } from 'react';
import Header from "./components/Header";
import { Routes, Route } from "react-router-dom";
import Swap from "./components/Swap";
import Tokens from "./components/Tokens";
import Docs from "./components/Docs";
import { HashConnect } from 'hashconnect';
import axios from 'axios';
import { ContractId } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import HederaLogo from './img/hedera-logo.png';

const hashconnect = new HashConnect();

const appMetadata = {
    name: "EtaSwap",
    description: "DEX aggregator",
    icon: "https://etaswap.com/logo-bg.svg",
};

function App() {
    const [connectionData, setConnectionData] = useState({});
    const [signer, setSigner] = useState({});
    const [tokens, setTokens] = useState(new Map());
    const [network, setNetwork] = useState('mainnet');

    const initHashconnect = async (skipConnect = false) => {
        const initData = await hashconnect.init(appMetadata, network, true);
        if (initData?.savedPairings?.[0]?.network === network) {
            //reload page
            setConnectionData(initData?.savedPairings?.[0]);
            const provider = hashconnect.getProvider(network, initData?.topic, initData?.savedPairings?.[0]?.accountIds?.[0]);
            setSigner(hashconnect.getSigner(provider));
        } else if (!skipConnect) {
            //new connection
            await hashconnect.disconnect(connectionData?.topic);
            await hashconnect.clearConnectionsAndData();
            await hashconnect.init(appMetadata, network, true);
            hashconnect.connectToLocalWallet();
        }

    }

    useEffect(() => {
        hashconnect.pairingEvent.on((pairingData) => {
            setConnectionData(pairingData);
            const provider = hashconnect.getProvider(network, pairingData?.topic, pairingData?.accountIds?.[0]);
            setSigner(hashconnect.getSigner(provider));
        });

        initHashconnect(true);
    }, []);

    useEffect(() => {
        let tokenSources = [
            axios.get('https://api.saucerswap.finance/tokens'),
            axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
            axios.get('https://heliswap.infura-ipfs.io/ipfs/Qmf5u6N2ohZnBc1yxepYzS3RYagkMZbU5dwwU4TGxXt9Lf'),
        ];
        if (network === 'testnet') {
            tokenSources = [
                axios.get('https://test-api.saucerswap.finance/tokens'),
                axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
            ];
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
                    tokenMap.set(solidityAddress.toLowerCase(), {
                        name: token.name,
                        symbol: token.symbol,
                        decimals: token.decimals,
                        address: token.id,
                        solidityAddress,
                        icon: token.icon ? `https://www.saucerswap.finance/${token.icon?.replace(/^\//, '')}` : '',
                        providers: ['SaucerSwap'],
                    });
            });

            pangolinTokens.data.tokens.filter(token => token.chainId === (network === 'mainnet' ? 295 : 296)).map(token => {
                const existing = tokenMap.get(token.address.toLowerCase());
                if (existing) {
                    existing.providers.push('Pangolin');
                } else {
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
                    } else {
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
                connect={hashconnect}
                connectionData={connectionData}
                setConnectionData={setConnectionData}
                network={network}
                setNetwork={setNetwork}
                setSigner={setSigner}
                initHashconnect={() => initHashconnect}
            />
            <div className="mainWindow">
                <Routes>
                    <Route path="/" element={<Swap
                        tokens={tokens}
                        connect={hashconnect}
                        connectionData={connectionData}
                        signer={signer}
                        network={network}
                    />}/>
                    <Route path="/tokens" element={<Tokens tokens={tokens} network={network}/>}/>
                    <Route path="/docs" element={<Docs/>}/>
                </Routes>
            </div>
        </div>
    )
}

export default App;
