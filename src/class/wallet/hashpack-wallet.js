import { HashConnect } from 'hashconnect';

export class HashpackWallet {
    name = 'hashpack'
    address = ''
    connectionData = null
    signer = null
    appMetadata = {
        name: "EtaSwap",
        description: "DEX aggregator",
        icon: "https://etaswap.com/logo-bg.svg",
    };

    constructor(setWallet) {
        this.hashconnect = new HashConnect();
        this.setWallet = setWallet;

        this.hashconnect.pairingEvent.on((pairingData) => {
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
        });
    }

    async connect(network, onLoad = false) {
        const initData = await this.hashconnect.init(this.appMetadata, network, true);
        if (initData?.savedPairings?.[0]?.network === network) {
            //reload page
            this.network = network;
            this.connectionData = initData?.savedPairings?.[0];
            this.address = this.connectionData?.accountIds?.[0];
            const provider = this.hashconnect.getProvider(network, initData?.topic, initData?.savedPairings?.[0]?.accountIds?.[0]);
            this.signer = this.hashconnect.getSigner(provider);
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

    async disconnect() {
        await this.hashconnect.disconnect(this.connectionData?.topic);
        await this.hashconnect.clearConnectionsAndData();
        this.connectionData = null;
        this.signer = null;
        this.address = '';
        this.refreshWallet();
    }

}