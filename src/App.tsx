import React, { useEffect, useState } from 'react';
import Header from "./components/Header/Header";
import axios from 'axios';
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
// @ts-ignore
import WalletConnectLogo from './assets/img/wallet-connect.svg';
// @ts-ignore
import WalletConnectIcon from './assets/img/wallet-connect-icon.svg';
// @ts-ignore
import KabilaLogo from './assets/img/kabila-logo.svg';
// @ts-ignore
import KabilaIcon from './assets/img/kabila-icon.svg';
import { HashpackWallet } from './class/wallet/hashpack-wallet';
import { BladeWallet } from './class/wallet/blade-wallet';
import Social from './components/Social/Social';
import { LoaderProvider } from "./components/Loader/LoaderContext";
import { useToaster } from "./components/Toaster/ToasterContext";
import { IWallet, IWallets, typeWallet } from "./models";
import AppRouter from "./router";
import { Token } from './types/token';
import { GetToken, HeliSwapGetToken, HSuiteGetToken, } from './class/providers/types/tokens';
import {API, MIRRORNODE, NETWORK, PROVIDERS, WHBAR_LIST} from './config';
import { toastTypes } from './models/Toast';
import { AggregatorId } from './class/providers/types/props';
import {ConnectWalletModal} from "./components/Header/components/ConnectWalletModal";
import Version from "./components/Version/Version";
import {WalletConnect} from "./class/wallet/wallet-connect";
import TOKENS_WITH_CUSTOM_FEES from './tokensWithCustomFeesMainnet.json';

const walletConnect = new WalletConnect();

function App() {
    const [wallet, setWallet] = useState<IWallet>({
        name: '',
        address: '',
        signer: null,
    });
    const [tokens, setTokens] = useState<Token[]>([]);
    const [rate, setRate] = useState<number | null>(null);
    const [walletModalOpen, setWalletModalOpen] = useState(false);

    const [wallets, setWallets] = useState<IWallets>({
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
    }});
    const [providers] = useState(PROVIDERS);
    const { showToast } = useToaster();

    const showFallbackToast = (exchangeName: string) => {
        showToast('Fetch error', `Error loading token list from ${exchangeName}`, toastTypes.warning);
    }

    const disconnectWallet = (name: string) => {
        wallets[name].instance.disconnect();
    }

    const connectWallet = (name: string) => {
        if (wallet.address) {
            if (wallet.name === name) {
                return null;
            }
            wallets[wallet.name].instance.disconnect();
        }
        wallets[name].instance.connect(false, wallets[name].extensionId);
        setWalletModalOpen(false);
    }

    useEffect(() => {
        if(wallet.address && wallets?.[wallet.name]?.instance?.updateBalance){
            wallets[wallet.name].instance.updateBalance();
        }
    }, [wallet.address]);

    useEffect(() => {
        walletConnect.init(setWallet).then(extensionData => {
            const walletConnectWallets: IWallets = {};
            extensionData.forEach(extension => {
                if (extension.id === 'cnoepnljjcacmnjnopbhjelpmfokpijm') {
                    walletConnectWallets.kabila = {
                        name: 'kabila',
                        title: extension.name || 'Kabila',
                        instance: walletConnect,
                        image: KabilaLogo,
                        icon: KabilaIcon,
                        extensionId: extension.id,
                    };
                }
            });
            walletConnectWallets.walletConnect = {
                name: 'walletConnect',
                title: 'WalletConnect',
                instance: walletConnect,
                image: WalletConnectLogo,
                icon: WalletConnectIcon,
            };
            setWallets({
                ...wallets,
                ...walletConnectWallets,
            })
        });
    }, []);

    useEffect(() => {
        wallets.hashpack.instance.connect(NETWORK, true);
        Promise.all([
            axios.get(`${MIRRORNODE}/api/v1/network/exchangerate`),
            axios.get(`${API}/tokens`)
        ]).then(([rate, tokens]) => {
            setRate(rate.data.current_rate.hbar_equivalent / rate.data.current_rate.cent_equivalent * 100);
            setTokens(tokens.data);
        });
    }, []);

    return (
        <>
            <LoaderProvider>
                <Header
                    wallet={wallet}
                    wallets={wallets}
                    setWalletModalOpen={setWalletModalOpen}
                    disconnectWallet={disconnectWallet}
                />
                <main className="main">
                    <AppRouter
                        wallet={wallet}
                        tokens={tokens}
                        rate={rate}
                        providers={providers}
                        setWalletModalOpen={setWalletModalOpen}
                    />
                </main>
                <ConnectWalletModal
                    connectWallet={connectWallet}
                    walletModalOpen={walletModalOpen}
                    wallets={wallets}
                    setWalletModalOpen={setWalletModalOpen}
                />
            </LoaderProvider>
            <Social/>
            <Version/>
        </>
    )
}

export default App;
