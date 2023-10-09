import { BladeConnector, ConnectorStrategy } from '@bladelabs/blade-web3.js';

export class BladeWallet {
    name = 'blade'
    address = ''
    signer = null
    appMetadata = {
        name: "EtaSwap",
        description: "DEX aggregator",
        url: "https://etaswap.com",
        icons: ["https://etaswap.com/logo-bg.svg"]
    }
    bladeConnector = null

    constructor(setWallet) {
        this.setWallet = setWallet;
    }

    refreshWallet() {
        this.setWallet({
            name: this.name,
            address: this.address,
            signer: this.signer,
        });
    }

    async connect(network, onLoad = false) {
        this.network = network;
        if (!this.bladeConnector) {
            this.bladeConnector = await BladeConnector.init(
                ConnectorStrategy.AUTO,
                this.appMetadata,
            );
            console.log(this.bladeConnector);
        }
        const accountIds = await this.bladeConnector.createSession({ network });
        this.address = accountIds?.[0];
        this.signer = this.bladeConnector.getSigner();
        this.refreshWallet();
    }

    async disconnect() {
        this.signer = null;
        this.address = '';
        console.log(this.bladeConnector);
        await this.bladeConnector.killSession();
        this.refreshWallet();
    }

}