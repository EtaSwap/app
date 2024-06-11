import Long from "long";
import {
    DAppConnector, DAppSigner,
    ExtensionData,
    HederaChainId,
    HederaJsonRpcMethod,
    HederaSessionEvent
} from "@hashgraph/hedera-wallet-connect";
import {SessionTypes, SignClientTypes} from "@walletconnect/types";
import {
    AccountBalanceQuery,
    AccountId,
    Client,
    LedgerId,
    TokenAssociateTransaction,
    TransactionResponse
} from "@hashgraph/sdk";
import {NETWORK} from "../../config";

export class WalletConnect {
    name = 'walletConnect';
    address = '';
    signer: DAppSigner | null = null;
    private appMetadata: SignClientTypes.Metadata = {
        name: 'EtaSwap',
        description: 'DEX aggregator',
        url: 'https://app.etaswap.com',
        icons: ['https://etaswap.com/logo-color-bg.png']
    }
    setWallet: any;
    associatedTokens: Map<string, Long> | undefined;
    dAppConnector: DAppConnector | undefined;
    private projectId = 'c456032a29f47fa1833614114b6ee528'


    refreshWallet() {
        this.setWallet({
            name: this.name,
            address: this.address,
            associatedTokens: this.associatedTokens,
            signer: this.signer,
            auth: this.auth.bind(this),
            signTransaction: this.signTransaction.bind(this),
            executeTransaction: this.executeTransaction.bind(this),
            associateNewToken: this.associateNewToken.bind(this),
            updateBalance: this.updateBalance.bind(this),
        });
    }

    async init (setWallet: any): Promise<ExtensionData[]> {
        this.setWallet = setWallet;
        this.dAppConnector = new DAppConnector(
            this.appMetadata,
            LedgerId.MAINNET,
            this.projectId,
            Object.values(HederaJsonRpcMethod),
            [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
            [HederaChainId.Mainnet],
        )

        await this.dAppConnector.init({ logger: 'error' })

        if (this.dAppConnector) {
            return this.dAppConnector.extensions?.filter(
                (extension) => extension.available,
            );
        }
        return [];
    }

    async connect (onLoad = false, extensionId?: string) {
        try {
            if (!this.dAppConnector) {
                throw new Error('DAppConnector is required');
            }

            let session: SessionTypes.Struct;
            if (extensionId) {
                session = await this.dAppConnector.connectExtension(extensionId);
                this.name = extensionId === 'cnoepnljjcacmnjnopbhjelpmfokpijm' ? 'kabila' : 'walletConnect';
            } else {
                session = await this.dAppConnector.openModal();
                this.name = 'walletConnect';
            }

            const sessionAccount = session.namespaces?.hedera?.accounts?.[0]
            const accountId = sessionAccount?.split(':').pop()
            if (!accountId) {
                console.error('No account id found in the session')
            } else {
                this.address = accountId;
                this.signer = this.dAppConnector?.getSigner(AccountId.fromString(accountId));
            }

            this.refreshWallet();
        } catch(e) {
            console.error(e);
        }
    }

    async updateBalance(isDelay = false) {
        if (isDelay) {
            setTimeout(async () => {
                await this.getBalance();
            }, 3000);
        } else {
            await this.getBalance();
        }
    }

    getBalance = async () => {
        if (this.dAppConnector) {
            const client = NETWORK === 'testnet' ? Client.forTestnet() : Client.forMainnet();
            const balance = await new AccountBalanceQuery().setAccountId(this.address).execute(client);
            this.associatedTokens = balance.tokens?._map;
            this.associatedTokens!.set('HBAR', balance.hbars?.toTinybars() || Long.fromString('0'));
        } else {
            this.associatedTokens = undefined;
        }
        this.refreshWallet();
    }

    async associateNewToken(tokenAddress: string | null) {
        if (!tokenAddress) {
            return;
        }
        try {
            const associateTx = new TokenAssociateTransaction();
            associateTx.setTokenIds([tokenAddress]);
            associateTx.setAccountId(this.signer!.getAccountId().toString());
            await associateTx.freezeWithSigner(this.signer!);
            const result= await this.executeTransaction(associateTx);
            this.refreshWallet();
            return result;
        } catch (error) {
            this.refreshWallet();
            return null;
        }
    }

    async auth({ serverAddress, serverSignature, originalPayload }: any) {
        const payload = { serverSignature, originalPayload };
        const signRes = await this.signer!.sign([new Uint8Array(Buffer.from(JSON.stringify(payload)))]);

        return signRes?.[0]?.signature;
    }

    async signTransaction(transaction: any) {
        const res = await this.signer!.signTransaction(transaction);
        return res.toBytes();
    }

    async executeTransaction(transaction: any) {
        const res: TransactionResponse = await transaction.executeWithSigner(this.signer);
        const client = NETWORK === 'testnet' ? Client.forTestnet() : Client.forMainnet();
        const receipt = await res.getReceipt(client);
        const status = receipt?.status?.toString();

        return {
            error: status === 'SUCCESS' ? null : 'Error execute transaction',
            res,
        }
    }

    async disconnect() {
        this.signer = null;
        this.address = '';
        await this.dAppConnector?.disconnectAll();
        this.refreshWallet();
    }
}