import "./App.css";
import React, { useState, useEffect } from 'react';
import Header from "./components/Header";
import {Routes, Route} from "react-router-dom";
import Swap from "./components/Swap";
import Tokens from "./components/Tokens";
import Docs from "./components/Docs";
import {useConnect, useAccount} from "wagmi"
import {MetaMaskConnector} from "@wagmi/connectors/metaMask"
import { HashConnect, HashConnectTypes } from 'hashconnect';
import axios from 'axios';
import { ContractId } from '@hashgraph/sdk';

const hashconnect = new HashConnect(true);

function App() {
  const [connectionData, setConnectionData] = useState({});
  const [signer, setSigner] = useState({});
  const [tokens, setTokens] = useState(new Map());
  const {connect} = useConnect({
    connector: new MetaMaskConnector(),
  });

  const isConnected = () => {
    return !!connectionData?.accountIds?.[0];
  }

  useEffect(()=>{
    let appMetadata = {
      name: "EtaSwap",
      description: "DEX aggregator",
      icon: "https://etaswap.com/logo.svg",
    };

    hashconnect.pairingEvent.on((pairingData) => {
      setConnectionData(pairingData);
    });

    hashconnect.init(appMetadata, "testnet", true).then((initData) => {
      setConnectionData(initData?.savedPairings?.[0]);
      const provider = hashconnect.getProvider('testnet', initData?.topic, initData?.savedPairings?.[0]?.accountIds?.[0]);
      setSigner(hashconnect.getSigner(provider));
    });
  }, []);

  useEffect(() => {
    Promise.all([
        axios.get('https://test-api.saucerswap.finance/tokens'),
        axios.get('https://raw.githubusercontent.com/pangolindex/tokenlists/main/pangolin.tokenlist.json'),
    ]).then(([saucerSwapTokens, pangolinTokens]) => {
      const tokenMap = new Map();
      saucerSwapTokens.data.map(token => {
        const solidityAddress = `0x${ContractId.fromString(token.id).toSolidityAddress()}`;
        tokenMap.set(solidityAddress, {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          address: token.id,
          solidityAddress,
          icon: token.icon ? `https://www.saucerswap.finance/${token.icon?.replace(/^\//, '')}` : '',
          providers: ['SaucerSwap'],
          dueDiligenceComplete: token.dueDiligenceComplete,
        });
      });
      pangolinTokens.data.tokens.filter(token => token.chainId === 296).map(token => {
        const existing = tokenMap.get(token.address);
        if (existing) {
          existing.providers.push('Pangolin');
        } else {
          tokenMap.set(token.address, {
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
      console.log([...tokenMap]);
      setTokens(tokenMap);
    });
  }, []);

  return (
    <div className="App">
    <Header connect={hashconnect} connectionData={connectionData} isConnected={isConnected} setConnectionData={setConnectionData}/>
    <div className="mainWindow">
      <Routes>
        <Route path="/" element={<Swap isConnected={isConnected} tokens={tokens} connect={hashconnect} connectionData={connectionData} signer={signer} />}/>
        <Route path="/tokens" element={<Tokens tokens={tokens}/>}/>
        <Route path="/docs" element={<Docs/>}/>
        </Routes>
    </div>
        </div>
  )
}

export default App;
