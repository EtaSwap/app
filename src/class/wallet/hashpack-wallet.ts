import { HashConnect } from 'hashconnect';
import {TokenAssociateTransaction} from '@hashgraph/sdk';

export class HashpackWallet {
    name = 'hashpack';
    address = '';
    connectionData: any = null;
    signer: any = null;
    appMetadata = {
        name: "EtaSwap",
        description: "DEX aggregator",
        icon: "https://etaswap.com/logo-bg.svg",
    };
    hashconnect: any;
    setWallet: any;
    network: any;
    associatedTokens: any[] | null = null;

    constructor(setWallet: any) {
        this.hashconnect = new HashConnect();
        this.setWallet = setWallet;

        this.hashconnect.pairingEvent.on((pairingData: any) => {
            this.connectionData = pairingData;
            this.address = this.connectionData?.accountIds?.[0];
            const provider = this.hashconnect.getProvider(this.network, pairingData?.topic, this.address);
            this.signer = this.hashconnect.getSigner(provider);
            this.refreshWallet();
        });
    }

    refreshWallet() {
        this.setWallet({
            name: this.name,
            address: this.address,
            signer: this.signer,
            associatedTokens: this.associatedTokens,
            auth: this.auth.bind(this),
            signTransaction: this.signTransaction.bind(this),
            executeTransaction: this.executeTransaction.bind(this),
            associateNewToken: this.associateNewToken.bind(this),
            updateBalance: this.updateBalance.bind(this)
        });
    }

    async connect(network: any, onLoad = false) {
        const initData = await this.hashconnect.init(this.appMetadata, network, true);
        if (initData?.savedPairings?.[0]?.network === network) {
            //reload page
            this.network = network;
            this.connectionData = initData?.savedPairings?.[0];
            this.address = this.connectionData?.accountIds?.[0];
            await this.updateBalance();
            this.refreshWallet();
        } else if (!onLoad) {
            //new connection
            this.network = network;
            await this.hashconnect.disconnect(this.connectionData?.topic);
            await this.hashconnect.clearConnectionsAndData();
            await this.hashconnect.init(this.appMetadata, network, true);
            this.hashconnect.connectToLocalWallet();
        }
    }

    async updateBalance() {
        if(this.network && this.connectionData?.topic){
            const provider = this.hashconnect.getProvider(this.network, this.connectionData?.topic, this.connectionData?.accountIds?.[0]);
            this.signer = this.hashconnect.getSigner(provider);
            const balance = await this.signer.getAccountBalance();
            console.log(balance);
            this.associatedTokens = balance.tokens?._map;
        }else {
            this.associatedTokens = null;
        }
        this.refreshWallet();
    }

    async associateNewToken(tokenAddress: string | null) {
        if(!tokenAddress){
            return;
        }
        try {
            console.log(tokenAddress, "R9!");
            const associateTx = await new TokenAssociateTransaction();
            associateTx.setTokenIds([tokenAddress]);
            associateTx.setAccountId(this.signer.accountToSign);
            await associateTx.freezeWithSigner(this.signer);
            const result: any = await this.executeTransaction(associateTx);
            this.refreshWallet();
            return result;
        } catch (error) {
            this.refreshWallet();
            return {error: 'ERROR'};
        }
    }

    async auth({ serverAddress, serverSignature, originalPayload }: any) {
        const authRes = await this.hashconnect.authenticate(
            this.connectionData?.topic,
            this.address,
            serverAddress,
            serverSignature,
            originalPayload
        );

        return authRes?.userSignature;
    }

    async signTransaction(transaction: any) {
        const res = await this.hashconnect.sendTransaction(
            this.connectionData?.topic,
            {
                topic: this.connectionData?.topic,
                byteArray: new Uint8Array(transaction.toBytes()),
                metadata: {
                    accountToSign: this.address,
                    returnTransaction: true,
                    hideNft: false,
                },
            },
        );

        return res.signedTransaction;
    }

    async executeTransaction(transaction: any) {
        const res = await this.hashconnect.sendTransaction(
            this.connectionData?.topic,
            {
                topic: this.connectionData?.topic,
                byteArray: new Uint8Array(transaction.toBytes()),
                metadata: {
                    accountToSign: this.address,
                    hideNft: false,
                },
            },
        );

        return {
            error: res.success ? null : (res.error?.message || res.error.toString()),
            res: res.response,
        }
    }

    async disconnect() {
        await this.hashconnect.disconnect(this.connectionData?.topic);
        await this.hashconnect.clearConnectionsAndData();
        this.connectionData = null;
        this.signer = null;
        this.address = '';
        this.associatedTokens = null;
        this.refreshWallet();
    }

}
