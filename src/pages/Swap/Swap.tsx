import { message, Popover } from 'antd';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BigNumber, ethers } from 'ethers';
import {
    AccountAllowanceApproveTransaction,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    Transaction,
    TransferTransaction,
} from '@hashgraph/sdk';
import axios from 'axios';
import { SmartNodeSocket } from '../../class/smart-node-socket';
import { useLoader } from "../../components/Loader/LoaderContext";
import { useToaster } from "../../components/Toaster/ToasterContext";
import { bytesFromHex, sortTokens } from "./swap.utils";
import { SlippageModal } from "./Components/SlippageModal/SlippageModal";
import { TokensModal } from "./Components/TokensModal/TokensModal";
import { toastTypes } from "../../models/Toast";
import { Token } from '../../types/token';
import { Provider } from '../../class/providers/provider';
import { typeWallet } from "../../models";
import useDebounce from "../../hooks/useDebounce";
import { SortedPrice, TransactionType } from '../../types/sorted-price';
import {
    API,
    DEFAULT_TOKENS,
    EXCHANGE_ADDRESS,
    HSUITE_NODES,
    HSUITE_TOKEN_ADDRESS,
    MIRRORNODE,
    TOKEN_WITH_CUSTOM_FEES_LIST,
} from '../../config';
import { AggregatorId } from '../../class/providers/types/props';
import AssociateNewToken from './Components/AssociateNewToken/AssociateNewToken';
import defaultImage from "../../assets/img/default.svg";
import { trimNumberString } from '../../utils/utils';

export interface ISwapProps {
    wallet: any;
    tokens: Map<string, Token>;
    rate: number | null;
    providers: Record<string, Provider>;
    setWalletModalOpen: any;
}

function Swap({wallet, tokens: tokensMap, rate, providers, setWalletModalOpen}: ISwapProps) {
    const {showLoader, hideLoader, loading} = useLoader();
    const {showToast} = useToaster();

    const tokens = sortTokens(tokensMap);
    const [tokenOneAmountInput, setTokenOneAmountInput] = useState<string>('0');
    const [tokenTwoAmountInput, setTokenTwoAmountInput] = useState<string>('0');
    const [tokenOneAmount, setTokenOneAmount] = useState<string>('0');
    const [tokenTwoAmount, setTokenTwoAmount] = useState<string>('0');
    const [tokenOne, setTokenOne] = useState(tokens[DEFAULT_TOKENS[0]]);
    const [tokenTwo, setTokenTwo] = useState(tokens[DEFAULT_TOKENS[1]]);

    const debouncedTokenOneAmountInput: string = useDebounce(tokenOneAmountInput, 650);
    const debouncedTokenTwoAmountInput: string = useDebounce(tokenTwoAmountInput, 650);
    const [associatedButtons, setAssociatedButtons] = useState<Token[]>([]);
    const [slippage, setSlippage] = useState(1);
    const [feeOnTransfer, setFeeOnTransfer] = useState<boolean>(false);
    const [messageApi, contextHolder] = message.useMessage()
    const [isTokensModalOpen, setIsTokensModalOpen] = useState(false)
    const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false)
    const [checkAllRatesOpen, setCheckAllRatesOpen] = useState(true);
    const [changeToken, setChangeToken] = useState<any>(1)
    const refreshCount = useRef(0);
    const refreshTimer = useRef<any>(0);
    const [isRefreshAnimationActive, setIsRefreshAnimationActive] = useState(false);
    const [searchPhrase, setSearchPhrase] = useState('');
    const [hiddenTokens, setHiddenTokens] = useState<number[]>([]);
    const [sortedPrices, setSortedPrices] = useState<SortedPrice[]>([]);
    const [activeRoute, setActiveRoute] = useState<number>(0);
    const [hasUnlimitedAssociations, setHasUnlimitedAssociations] = useState<boolean>(false);

    const [searchParams] = useSearchParams();

    const ASSOCIATION_GAS = 780000;

    const smartNodeSocket = async () => {
        return new Promise(async (resolve, reject) => {
            if (!wallet?.address) {
                return null;
            }
            try {
                showLoader();
                let randomNode = HSUITE_NODES[Math.floor(Math.random() * HSUITE_NODES.length)];
                let nodeSocket: any = new SmartNodeSocket(randomNode, wallet.address, providers.HSuite.getApiKey());

                nodeSocket.getSocket('gateway').on('connect', async () => {
                    console.log(`account ${wallet.address} connected to node ${nodeSocket.getNode().operator}`);
                });

                nodeSocket.getSocket('gateway').on('disconnect', async () => {
                    console.log(`account ${wallet.address} disconnected from node ${nodeSocket.getNode().operator}`);
                });

                nodeSocket.getSocket('gateway').on('errors', async (event: any) => {
                    console.error('error event', event);
                });

                nodeSocket.getSocket('gateway').on('authenticate', async (event: any) => {
                    if (event.isValidSignature) {
                        resolve({
                            message: `account ${wallet.address} authenticated to node ${nodeSocket.getNode().operator}, ready to operate with websockets/write operations...`,
                            socket: nodeSocket
                        })
                    } else {
                        showToast('Connection issue', `Account ${wallet.address} can't connect to node ${nodeSocket.getNode().operator}`, toastTypes.error);
                        reject(new Error(`Account ${wallet.address} can't connect to node ${nodeSocket.getNode().operator}`))
                    }
                });

                nodeSocket.getSocket('gateway').on('authentication', async (event: any) => {
                    let payload = {
                        serverSignature: new Uint8Array(event.signedData.signature),
                        originalPayload: event.payload
                    };

                    const walletSignature = await wallet.auth({
                        serverAddress: randomNode.operator,
                        serverSignature: payload.serverSignature,
                        originalPayload: payload.originalPayload,
                    });

                    nodeSocket.getSocket('gateway').emit('authenticate', {
                        signedData: {
                            signedPayload: payload,
                            userSignature: walletSignature,
                        },
                        walletId: wallet.address,
                    });
                });

                hideLoader();
                nodeSocket.getSocket('gateway').connect();
            } catch (error) {
                hideLoader();
                reject(error);
            }
        });
    }

    const handleSlippage = (e: any) => {
        setSlippage(e.target.value);
    }

    const changeAmountOne = (value: string) => {
        if (feeOnTransfer) {
            setFeeOnTransfer(false);
        }
        if (value.match(/^[0-9]{0,10}(?:\.[0-9]{0,8})?$/)) {
            setTokenOneAmountInput(
                trimNumberString(
                    value ? (['.', '0'].includes(value.charAt(value.length - 1)) ? value : parseFloat(value).toString()) : '0',
                    tokenOne.decimals,
                )
            );
        }
    }


    const changeAmountTwo = (value: string) => {
        if (!feeOnTransfer) {
            setFeeOnTransfer(true);
        }
        if (value.match(/^[0-9]{0,10}(?:\.[0-9]{0,8})?$/)) {
            setTokenTwoAmountInput(
                trimNumberString(
                    value ? (['.', '0'].includes(value.charAt(value.length - 1)) ? value : parseFloat(value).toString()) : '0',
                    tokenTwo.decimals,
                )
            );
        }
    }

    const switchTokens = () => {
        setTokenOne(tokenTwo);
        setTokenTwo(tokenOne);
        setTokenTwoAmountInput('0');
        setTokenTwoAmount('0');
        setTokenOneAmountInput('0');
        setTokenOneAmount('0');
        if (feeOnTransfer) {
            changeAmountOne(tokenTwoAmount);
        } else {
            changeAmountTwo(tokenOneAmount);
        }
    }

    const openTokensModal = (token: number) => {
        setChangeToken(token);
        setIsTokensModalOpen(true);
    }

    const modifyToken = (i: any) => {
        if (changeToken === 1) {
            setTokenOne(tokens[i]);
        } else {
            setTokenTwo(tokens[i]);
        }
        setIsTokensModalOpen(false);
        setSearchPhrase('');

        if (feeOnTransfer) {
            changeAmountTwo(tokenTwoAmount);
        } else {
            changeAmountOne(tokenOneAmount);
        }
    }

    const switchAllRates = () => {
        setCheckAllRatesOpen(!checkAllRatesOpen);
    }

    const parseTokenOneAmount = (): BigNumber => {
        const trimedTokenOneAmount = trimNumberString(tokenOneAmount, tokenOne.decimals);
        return ethers.utils.parseUnits(trimedTokenOneAmount, tokenOne.decimals);
    }

    const parseTokenTwoAmount = (): BigNumber => {
        const trimedTokenTwoAmount = trimNumberString(tokenTwoAmount, tokenTwo.decimals);
        return ethers.utils.parseUnits(trimedTokenTwoAmount, tokenTwo.decimals);
    }

    const fetchDex = async () => {
        const deadline = Math.floor(Date.now() / 1000) + 1000;

        const bestRate = sortedPrices?.[activeRoute];
        if (!bestRate?.amountIn || !bestRate?.amountOut) {
            messageApi.open({
                type: 'error',
                content: 'Failed to fetch rate',
                duration: 2
            });
            return;
        }

        if (bestRate.aggregatorId === AggregatorId.HSuite) {
            showLoader();
            const socketConnection: any = await smartNodeSocket();
            socketConnection.socket.getSocket('gateway').on('swapPoolRequest', async (resPool: any) => {
                try {
                    if (resPool.status === 'success') {
                        let transaction: TransferTransaction = Transaction.fromBytes(new Uint8Array(resPool.payload.transaction)) as TransferTransaction;
                        const minToReceive = parseTokenTwoAmount().mul(1000 - slippage * 10).div(1000);
                        let amountTo: BigNumber;
                        if (tokenTwo.solidityAddress === ethers.constants.AddressZero) {
                            amountTo = BigNumber.from(transaction.hbarTransfers.get(wallet.address)?.toTinybars()?.toString() || 0);
                            if (amountTo.lt(minToReceive)) {
                                throw new Error('Unexpected receive amount');
                            }
                        } else {
                            amountTo = BigNumber.from(transaction.tokenTransfers.get(tokenTwo.address)?.get(wallet.address)?.toString() || 0);
                            if (amountTo.lt(minToReceive)) {
                                throw new Error('Unexpected receive amount');
                            }
                        }


                        let signedTransactionBytes = await wallet.signTransaction(transaction);

                        socketConnection.socket.getSocket('gateway').on('swapPoolExecute', (responseEvent: any) => {
                            if (responseEvent.status === 'success') {
                                showToast(
                                    'Transaction',
                                    `The transaction was successfully processed. Transaction ID: ${responseEvent.payload?.transaction?.transactionId}`,
                                    toastTypes.success,
                                    responseEvent.payload?.transaction?.transactionId,
                                );
                                socketConnection.socket.getSocket('gateway').disconnect();
                            } else {
                                console.error(responseEvent);
                                showToast('Transaction', 'Unexpected error', toastTypes.error);
                            }
                        });

                        socketConnection.socket.getSocket('gateway').emit('swapPoolExecute', {
                            type: 'swapPoolExecute',
                            transactionBytes: signedTransactionBytes,
                        }, (error: any) => {
                            if (error) {
                                console.error(error);
                                showToast('Transaction', 'Unexpected error', toastTypes.error);
                            }
                        });
                    } else {
                        console.error(resPool.error);
                        showToast('Transaction', resPool.error, toastTypes.error);
                    }
                } catch (e) {
                    console.error(e);
                    showToast('Transaction', `Unexpected error: ${JSON.stringify(e)}`, toastTypes.error);
                }
            });

            let amountFromHsuite = parseTokenOneAmount();
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                amountFromHsuite = amountFromHsuite.mul(1000 - providers[bestRate.aggregatorId].feePromille).div(1000);
            } else if (tokenOne.symbol === 'HSUITE') {
                const hSuiteFee = Math.max(10000, amountFromHsuite.mul(providers[bestRate.aggregatorId].feeDEXPromille).div(1000).toNumber());
                amountFromHsuite = amountFromHsuite.sub(hSuiteFee);
            }

            let swapObj = {
                baseToken: {
                    details: {
                        id: tokenOne.solidityAddress === ethers.constants.AddressZero ? 'HBAR' : tokenOne.address,
                        symbol: tokenOne.symbol,
                        decimals: tokenOne.decimals,
                    },
                    amount: {
                        value: ethers.utils.formatUnits(
                            amountFromHsuite,
                            tokenOne.decimals
                        )
                    }
                },
                swapToken: {
                    details: {
                        id: tokenTwo.solidityAddress === ethers.constants.AddressZero ? 'HBAR' : tokenTwo.address,
                        symbol: tokenTwo.symbol,
                        decimals: tokenTwo.decimals,
                    },
                    amount: {
                        value: ethers.utils.formatUnits(
                            parseTokenTwoAmount(),
                            tokenTwo.decimals
                        )
                    }
                },
            };

            socketConnection.socket.getSocket('gateway').emit('swapPoolRequest', {
                type: 'swapPoolRequest',
                senderId: wallet.address,
                swap: swapObj
            });
        } else {
            showLoader();
            if (tokenOne.solidityAddress !== ethers.constants.AddressZero) {
                const allowanceTx = await new AccountAllowanceApproveTransaction()
                    .approveTokenAllowance(
                        tokenOne.address,
                        wallet?.address,
                        EXCHANGE_ADDRESS,
                        // @ts-ignore
                        feeOnTransfer
                            ? parseTokenOneAmount().mul(1000 + slippage * 10).div(1000).toString()
                            : parseTokenOneAmount().toString(),
                    )
                    .freezeWithSigner(wallet.signer);

                try {
                    const approveTransaction = await wallet.executeTransaction(allowanceTx);
                    if (approveTransaction.error) {
                        showToast('Transaction', approveTransaction.error, toastTypes.error);
                        throw approveTransaction.error;
                    }
                } catch (e) {
                    hideLoader();
                    throw e;
                }

            }

            //prevent double-firing approval event on HashPack
            await new Promise(resolve => setTimeout(resolve, 300));

            let swapTransaction: Transaction;
            if (bestRate.transactionType === TransactionType.SPLIT_SWAP) {
                let additionalAssociationGas = 0;
                if (tokenTwo.solidityAddress !== ethers.constants.AddressZero) {
                    const [assoc1ToProvider, assoc2ToProvider] = await Promise.all([
                        checkProviderAssociation(bestRate.aggregatorId[0], tokenTwo.address),
                        checkProviderAssociation(bestRate.aggregatorId[1], tokenTwo.address),
                    ]);
                    if (!assoc1ToProvider) {
                        additionalAssociationGas += ASSOCIATION_GAS;
                    }
                    if (!assoc2ToProvider) {
                        additionalAssociationGas += ASSOCIATION_GAS;
                    }
                }

                swapTransaction = await new ContractExecuteTransaction()
                    .setContractId(EXCHANGE_ADDRESS)
                    .setGas(bestRate.gasEstimate + additionalAssociationGas)
                    .setFunction('splitSwap', new ContractFunctionParameters()
                        .addStringArray(bestRate.aggregatorId)
                        .addBytesArray(bestRate.path.map(path => bytesFromHex(path.substring(2))))
                        .addUint256Array(
                            // @ts-ignore
                            bestRate.amountIn.map(amountIn => {
                                return feeOnTransfer
                                    ? amountIn.mul(1000 + slippage * 10).div(1000).toString()
                                    : amountIn.toString()
                            })
                        )
                        .addUint256Array(
                            // @ts-ignore
                            bestRate.amountOut.map(amountOut => {
                                return feeOnTransfer
                                    ? amountOut.toString()
                                    : amountOut.mul(1000 - slippage * 10).div(1000).toString()
                            })
                        )
                        .addUint256(deadline)
                        .addBool(tokenOne.solidityAddress === ethers.constants.AddressZero)
                        .addBool(feeOnTransfer)
                    )
                    .setTransactionMemo('Token Swap executed via EtaSwap')
                    .setPayableAmount(tokenOne.solidityAddress === ethers.constants.AddressZero
                        ? (feeOnTransfer
                                ? ethers.utils.formatUnits(summAmount(bestRate.amountIn).mul(1000 + slippage * 10).div(1000), 8)
                                : ethers.utils.formatUnits(summAmount(bestRate.amountIn), 8)
                        )
                        : 0)
                    .freezeWithSigner(wallet.signer);
            } else {
                let additionalAssociationGas = 0;
                if (tokenTwo.solidityAddress !== ethers.constants.AddressZero) {
                    const assocToProvider = await checkProviderAssociation(bestRate.aggregatorId, tokenTwo.address);
                    if (!assocToProvider) {
                        additionalAssociationGas += ASSOCIATION_GAS;
                    }
                }

                swapTransaction = await new ContractExecuteTransaction()
                    .setContractId(EXCHANGE_ADDRESS)
                    .setGas(bestRate.gasEstimate + additionalAssociationGas)
                    .setFunction('swap', new ContractFunctionParameters()
                        .addString(bestRate.aggregatorId)
                        .addBytes(bytesFromHex(bestRate.path.substring(2)))
                        .addUint256(
                            // @ts-ignore
                            // TODO: BigNumber -> bigNumber.js conversion?
                            feeOnTransfer
                                ? bestRate.amountIn.mul(1000 + slippage * 10).div(1000).toString()
                                : bestRate.amountIn.toString()
                        )
                        .addUint256(
                            // @ts-ignore
                            feeOnTransfer
                                ? bestRate.amountOut.toString()
                                : bestRate.amountOut.mul(1000 - slippage * 10).div(1000).toString()
                        )
                        .addUint256(deadline)
                        .addBool(tokenOne.solidityAddress === ethers.constants.AddressZero)
                        .addBool(feeOnTransfer)
                    )
                    .setTransactionMemo('Token Swap executed via EtaSwap')
                    .setPayableAmount(tokenOne.solidityAddress === ethers.constants.AddressZero
                        ? (feeOnTransfer
                                ? ethers.utils.formatUnits(bestRate.amountIn.mul(1000 + slippage * 10).div(1000), 8)
                                : ethers.utils.formatUnits(bestRate.amountIn, 8)
                        )
                        : 0)
                    .freezeWithSigner(wallet.signer);
            }

            let execTransaction: any = null;
            try {
                execTransaction = await wallet.executeTransaction(swapTransaction);
                if (execTransaction.error) {
                    showToast('Transaction', execTransaction.error, toastTypes.error);
                    throw execTransaction.error;
                }
            } catch (e) {
                hideLoader();
                throw e;
            }

            if (execTransaction.res?.transactionId) {
                const idTransaction = `${execTransaction.res.transactionId.toString().substr(0, 4)}${execTransaction.res.transactionId.toString().substr(4).replace(/@/, '-').replace('.', '-')}`;
                setTimeout(() => {
                    axios.get(`${MIRRORNODE}/api/v1/transactions/${idTransaction}`).then(res => {
                        if (res?.data?.transactions?.[0]?.result) {
                            showToast(
                                'Transaction',
                                `The transaction was successfully processed. Transaction ID: ${execTransaction.res.transactionId.toString()}`,
                                toastTypes.success,
                                execTransaction.res.transactionId.toString(),
                            );
                        } else {
                            showToast('Transaction', 'Error on processing transaction', toastTypes.error);
                        }
                    }).finally(() => {
                        hideLoader();
                    });
                }, 6000);
            } else {
                console.error('Empty/incorrect transaction response');
                showToast('Transaction', 'Unexpected error', toastTypes.error);
            }
        }

        wallet.updateBalance(true);
    }

    const getActionButton = () => {
        if (!wallet.address) {
            return <button
                className="button swap__button"
                onClick={() => setWalletModalOpen(true)}
            >Connect wallet</button>
        }

        let allTokensAssociated = true;
        if (wallet.associatedTokens && tokenOne && tokenTwo) {
            if (!(wallet.associatedTokens.has(tokenOne.address) || tokenOne.symbol === typeWallet.HBAR) ||
                !(wallet.associatedTokens.has(tokenTwo.address) || tokenTwo.symbol === typeWallet.HBAR)) {
                allTokensAssociated = false;
            }
            const isHSuiteRequired = sortedPrices?.length > 0 ? sortedPrices[activeRoute].aggregatorId === AggregatorId.HSuite : false;
            const hSuiteToken = tokens.find(token => token.solidityAddress === HSUITE_TOKEN_ADDRESS);
            if (isHSuiteRequired && !(wallet.associatedTokens?.has(hSuiteToken?.address))) {
                allTokensAssociated = false;
            }
        }
        if (!allTokensAssociated && !hasUnlimitedAssociations) {
            return <AssociateNewToken handleClick={associateToken} associatedButtons={associatedButtons}/>
        }

        const bestPrice = sortedPrices?.[activeRoute];
        if (!bestPrice?.amountIn || !bestPrice?.amountOut) {
            return <button
                className="button swap__button"
                onClick={fetchDex}
                disabled={true}
            >Swap</button>
        }

        return <button
            className="button swap__button"
            onClick={fetchDex}
        >Swap</button>
    }

    const getNetworkFee = () => {
        const bestPrice = sortedPrices?.[activeRoute];
        if (!rate || !tokenOne || !tokenTwo || !bestPrice?.aggregatorId) {
            return 0;
        }
        if (bestPrice.aggregatorId === AggregatorId.HSuite) {
            return rate * 0.0016;
        }
        const approxCost1Gas = 0.000000082;
        return rate * bestPrice.gasEstimate * approxCost1Gas;
    }

    const fetchPrices = async (): Promise<void> => {
        if (!tokenOne?.solidityAddress || !tokenTwo?.solidityAddress) {
            return;
        }
        try {
            showLoader();
            const amount = feeOnTransfer ? parseTokenTwoAmount().toString() : parseTokenOneAmount().toString();
            const req = `${API}/rates?tokenFrom=${tokenOne.solidityAddress}&tokenTo=${tokenTwo.solidityAddress}&amount=${amount}&isReverse=${feeOnTransfer.toString()}`;
            const res = await axios.get(req);
            setSortedPrices(res.data.map((price: any) => ({
                ...price,
                amountIn: Array.isArray(price.amountFrom) ? price.amountFrom.map((amount: string) => BigNumber.from(amount)) : BigNumber.from(price.amountFrom),
                amountOut: Array.isArray(price.amountTo) ? price.amountTo.map((amount: string) => BigNumber.from(amount)) : BigNumber.from(price.amountTo),
            })));
        } catch (e) {
            console.log(e);
            showToast('Error API response', JSON.stringify(e), toastTypes.error);
        } finally {
            hideLoader();
        }
    }

    const summAmount = (amount: BigNumber | BigNumber[]): BigNumber => {
        if (Array.isArray(amount)) {
            return amount.reduce((acc, val) => acc.add(val), BigNumber.from(0));
        }
        return amount;
    }

    const associateToken = async (token: Token) => {
        showLoader();
        const result = await wallet.associateNewToken(token.address);

        if (result) {
            if (result.error) {
                if (result.error === "USER_REJECT") {
                    showToast('Associate Token', `Token ${token.name} association was rejected.`, toastTypes.error);
                } else if (result.error.includes('precheck with status')) {
                    showToast('Associate token', result.error, toastTypes.error);
                } else if (result.error.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
                    showToast('Associate Token', result.error, toastTypes.error);
                } else {
                    showToast('Error', `An unknown error occurred`, toastTypes.error);
                }
            } else if (result?.res?.nodeId) {
                showToast('Associate Token', `Token ${token.name} associated to account`, toastTypes.success);
            }
        } else {
            showToast('Error', `An unknown error occurred.`, toastTypes.error);
        }
        wallet.updateBalance(true);
        checkAssociateTokens();
        hideLoader();
    }

    const checkProviderAssociation = async (aggregatorId: AggregatorId, tokenId: string) => {
        try {
            const tokenInfo = await axios.get(`${MIRRORNODE}/api/v1/accounts/${wallet.address}/tokens?token.id=${tokenId}`);
            return tokenInfo.data?.tokens?.length > 0;
        } catch(e) {
            console.error(e);
        }
        return false;
    }

    const checkUnlimitedAssociations = async () => {
        if (!wallet?.address) {
            setHasUnlimitedAssociations(false);
            return;
        }

        try {
            const accountInfo = await axios.get(`${MIRRORNODE}/api/v1/accounts/${wallet.address}`);
            setHasUnlimitedAssociations(accountInfo.data?.max_automatic_token_associations === -1);
        } catch(e) {
            console.error(e);
        }
    }

    const checkAssociateTokens = () => {
        if ((wallet && wallet.signer === null) || hasUnlimitedAssociations) {
            setAssociatedButtons([]);
            return;
        }

        if (wallet.associatedTokens && tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            const isHSuiteRequired = sortedPrices?.length > 0 ? sortedPrices[activeRoute].aggregatorId === AggregatorId.HSuite : false;
            const hSuiteToken = tokens.find(token => token.solidityAddress === HSUITE_TOKEN_ADDRESS);
            let tokensToAssociate: Token[] = [];
            if (!(wallet.associatedTokens?.has(tokenOne.address)) && tokenOne.symbol !== typeWallet.HBAR) {
                tokensToAssociate.push({...tokenOne});
            }
            if (!(wallet.associatedTokens?.has(tokenTwo.address)) && tokenTwo.symbol !== typeWallet.HBAR) {
                tokensToAssociate.push({...tokenTwo});
            }
            const isHSuiteInList = !!tokensToAssociate.find(token => token.solidityAddress === HSUITE_TOKEN_ADDRESS);
            if (!isHSuiteInList && isHSuiteRequired) {
                if (!(wallet.associatedTokens?.has(hSuiteToken?.address))) {
                    tokensToAssociate.push(hSuiteToken!);
                }
            }
            setAssociatedButtons(filterUniqueTokens(tokensToAssociate));
        }
    }

    const filterUniqueTokens = (tokens: Token[]) => {
        const result = tokens.reduce((acc: Token[], current: Token) => {
            const x = acc.find(item => item.address === current.address);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);
        return result;
    }

    const getSwapRouteCoin = (solidityAddress: string): ReactElement | undefined => {
        const token = tokensMap.get(solidityAddress);
        if (!token) {
            return;
        }
        return <div className="swap__route-coin" key={solidityAddress}>
            <img
                src={token.icon}
                alt={token.symbol}
                className="swap__route-icon"
                onError={(e) => {
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src = defaultImage;
                }}
            />
            <span className="swap__route-symbol">{token.symbol}</span>
        </div>;
    }

    const getTokenOneAmount = (): string => {
        if (tokenOne) {
            return wallet.associatedTokens?.get(tokenOne.address || 'HBAR')?.div(Math.pow(10, tokenOne.decimals)).toString();
        }
        return '';
    }

    const getTokenTwoAmount = (): string => {
        if (tokenTwo) {
            return wallet.associatedTokens?.get(tokenTwo.address || 'HBAR')?.div(Math.pow(10, tokenTwo.decimals)).toString();
        }
        return '';
    }

    const triggerCalculation = () => {
        checkAssociateTokens();
        setIsRefreshAnimationActive(false);
        clearTimeout(refreshTimer.current);
        refreshCount.current = 0;
        refreshTimer.current = setTimeout(refreshRate, 0);
    }

    const refreshRate = () => {
        setIsRefreshAnimationActive(false);
        refreshCount.current = refreshCount.current + 2;
        if (
            tokenOne?.solidityAddress
            && tokenTwo?.solidityAddress
            && (feeOnTransfer ? tokenTwoAmount : tokenOneAmount) !== '0'
        ) {
            fetchPrices().then(() => {
                setIsRefreshAnimationActive(true);
                refreshTimer.current = setTimeout(refreshRate, (25000 + 30 * refreshCount.current * refreshCount.current));
            });
        }
    };

    const setInputByDivider = (divider: number) => {
        const tokenOneAmount = getTokenOneAmount();
        if (tokenOneAmount) {
            changeAmountOne(BigNumber.from(tokenOneAmount).div(divider).toString());
        }
    }

    const setTargetPrice = (route: number) => {
        if (feeOnTransfer) {
            const bestAmountIn = summAmount(sortedPrices?.[route]?.amountIn)?.toString();
            if (tokenTwoAmount && bestAmountIn) {
                setTokenOneAmountInput(ethers.utils.formatUnits(bestAmountIn, tokenOne?.decimals));
            } else {
                setTokenOneAmountInput('0');
            }
        } else {
            const bestAmountOut = summAmount(sortedPrices?.[route]?.amountOut)?.toString();
            if (tokenOneAmount && bestAmountOut) {
                setTokenTwoAmountInput(ethers.utils.formatUnits(bestAmountOut, tokenTwo?.decimals));
            } else {
                setTokenTwoAmountInput('0');
            }
        }
    }

    useEffect(() => {
        if (!feeOnTransfer && tokenOneAmountInput === '0') {
            setTokenTwoAmountInput('0');
            setTokenTwoAmount('0');
            setSortedPrices([]);
        } else if (!feeOnTransfer && tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            triggerCalculation();
        }
    }, [tokenOneAmount]);

    useEffect(() => {
        if (feeOnTransfer && tokenTwoAmount === '0') {
            setTokenOneAmountInput('0');
            setTokenOneAmount('0');
            setSortedPrices([]);
        } else if (feeOnTransfer && tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            triggerCalculation();
        }
    }, [tokenTwoAmount]);

    useEffect(() => {
        setActiveRoute(0);
        if (activeRoute === 0) {
            setTargetPrice(0);
        }
    }, [sortedPrices]);


    useEffect(() => {
        setTargetPrice(activeRoute);
    }, [activeRoute]);

    useEffect(() => {
        setTokenTwoAmount(debouncedTokenTwoAmountInput);
    }, [debouncedTokenTwoAmountInput]);

    useEffect(() => {
        setTokenOneAmount(debouncedTokenOneAmountInput);
    }, [debouncedTokenOneAmountInput]);

    useEffect(() => {
        let tokenOne = tokens[DEFAULT_TOKENS[0]];
        let tokenTwo = tokens[DEFAULT_TOKENS[1]];
        if (searchParams.get('tokenFrom')) {
            const tokenFromQuery = tokens.find(token => token.solidityAddress === searchParams.get('tokenFrom'));
            if (tokenFromQuery) {
                tokenOne = tokenFromQuery;
            }
        }
        if (searchParams.get('tokenTo')) {
            const tokenToQuery = tokens.find(token => token.solidityAddress === searchParams.get('tokenTo'));
            if (tokenToQuery) {
                tokenTwo = tokenToQuery;
            }
        }

        setTokenOne(tokenOne);
        setTokenTwo(tokenTwo);
        setTokenOneAmountInput('0');
        setTokenTwoAmountInput('0');
        setTokenOneAmount('0');
        setTokenTwoAmount('0');
    }, [tokensMap]);

    useEffect(() => {
        triggerCalculation();
    }, [tokenOne, tokenTwo]);

    useEffect(() => {
        checkUnlimitedAssociations();
        checkAssociateTokens();
    }, [wallet]);

    useEffect(() => {
        return () => {
            clearTimeout(refreshTimer.current);
        }
    }, [])

    return (
        <>
            {contextHolder}
            <TokensModal
                hiddenTokens={hiddenTokens}
                modifyToken={modifyToken}
                associatedTokens={wallet.associatedTokens}
                tokens={tokens}
                isOpen={isTokensModalOpen}
                setIsOpen={setIsTokensModalOpen}
                searchPhrase={searchPhrase}
                setSearchPhrase={setSearchPhrase}
                setHiddenTokens={setHiddenTokens}
            />
            <SlippageModal
                handleSlippage={handleSlippage}
                slippage={slippage}
                isOpen={isSlippageModalOpen}
                setIsOpen={setIsSlippageModalOpen}
            />
            <div className="swap">
                <div className="swap__header">
                    <div className="swap__title">Swap</div>
                    <div className="swap__settings">
                        <svg className="swap__cogwheel" onClick={() => setIsSlippageModalOpen(true)}>
                            <use href="#icon--cogwheel" xlinkHref="#icon--cogwheel"></use>
                        </svg>
                    </div>
                </div>
                <div className="swap__field-wrapper">
                    <div className="swap__field">
                        <input
                            placeholder='0'
                            value={tokenOneAmountInput === '0' ? '' : tokenOneAmountInput}
                            onChange={e => changeAmountOne(e.target.value)}
                            disabled={loading()}
                            className='swap__input'
                            type='text'
                        />
                        <span className="swap__field-title">You pay</span>
                        <div className="swap__chip-wrapper">
                            <button className="button swap__chip" onClick={() => setInputByDivider(4)}>25%</button>
                            <button className="button swap__chip" onClick={() => setInputByDivider(2)}>50%</button>
                            <button className="button swap__chip" onClick={() => setInputByDivider(1)}>MAX</button>
                        </div>
                        <div className="swap__coin" onClick={() => openTokensModal(1)}>
                            <img
                                src={tokenOne?.icon}
                                alt="Token one logo"
                                className="swap__coin-icon"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).onerror = null;
                                    (e.target as HTMLImageElement).src = defaultImage;
                                }}
                            />
                            <span className="swap__coin-name text--gradient">{tokenOne?.symbol}</span>
                        </div>
                        {getTokenOneAmount() ?
                            <span className="swap__balance">Balance: {getTokenOneAmount()}</span> : ''}
                        {/*<span className="swap__balance-usd">~$10.7</span>*/}
                    </div>
                    <button className="swap__switch" onClick={switchTokens}>&#10607;</button>
                    <div className="swap__field">
                        <input
                            placeholder='0'
                            value={tokenTwoAmountInput === '0' ? '' : tokenTwoAmountInput}
                            onChange={e => changeAmountTwo(e.target.value)}
                            disabled={loading()}
                            className='swap__input'
                            type='text'
                        />
                        <span className="swap__field-title">You receive</span>
                        <div className="swap__coin" onClick={() => openTokensModal(2)}>
                            <img
                                src={tokenTwo?.icon}
                                alt="Token two logo"
                                className="swap__coin-icon"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).onerror = null;
                                    (e.target as HTMLImageElement).src = defaultImage;
                                }}
                            />
                            <span className="swap__coin-name text--gradient">{tokenTwo?.symbol}</span>
                        </div>
                        {getTokenTwoAmount() ?
                            <span className="swap__balance">Balance: {getTokenTwoAmount()}</span> : ''}
                        {/*<span className="swap__balance-usd">~$9.7</span>*/}
                    </div>
                </div>
                <div className="swap__details">
                    {(tokenOneAmount !== '0' && tokenTwoAmount !== '0')
                        ? <div className="swap__min-receive">
                            {feeOnTransfer
                                ? <>
                                    Max to
                                    sell: {ethers.utils.formatUnits(parseTokenOneAmount().mul(1000 + slippage * 10).div(1000).toString(), tokenOne.decimals)} {tokenOne?.symbol}
                                </>
                                : <>
                                    Min
                                    receive: {ethers.utils.formatUnits(parseTokenTwoAmount().mul(1000 - slippage * 10).div(1000).toString(), tokenTwo.decimals)} {tokenTwo?.symbol}
                                </>
                            }&nbsp;
                            <Popover
                                trigger='hover'
                                placement='right'
                                content={
                                    feeOnTransfer
                                        ? `End price is an estimate. You will sell at most ${ethers.utils.formatUnits(parseTokenOneAmount().mul(1000 + slippage * 10).div(1000).toString(), tokenOne.decimals)} ${tokenOne?.symbol} or the transaction will be aborted.`
                                        : `End price is an estimate. You will receive at least ${ethers.utils.formatUnits(parseTokenTwoAmount().mul(1000 - slippage * 10).div(1000).toString(), tokenTwo.decimals)} ${tokenTwo?.symbol} or the transaction will be aborted.`
                                }
                            >
                                <span className="swap__tooltip">
                                    <svg className="swap__question" viewBox="0 0 20 20">
                                        <use href="#icon--question" xlinkHref="#icon--question"></use>
                                    </svg>
                                </span>
                            </Popover>

                        </div>
                        : ''
                    }
                    <div className="swap__network-fee">
                        Network fee: ≈{getNetworkFee().toFixed(3)} HBAR&nbsp;
                        <Popover
                            trigger='hover'
                            placement='right'
                            content="Approximate value"
                        >
                            <span className="swap__tooltip">
                                <svg className="swap__question" viewBox="0 0 20 20">
                                    <use href="#icon--question" xlinkHref="#icon--question"></use>
                                </svg>
                            </span>
                        </Popover>
                    </div>
                </div>
                <hr className="swap__divider"/>
                <div className="swap__routes">
                    <div
                        className={`swap__routes-title ${checkAllRatesOpen ? 'swap__routes-title--active' : ''}`}
                        onClick={() => switchAllRates()}>Select route:
                    </div>
                    {checkAllRatesOpen
                        ? sortedPrices.map(({
                                                transactionType,
                                                aggregatorId,
                                                route
                                            }, i) =>
                            transactionType === TransactionType.SWAP
                                ? <div
                                    className={`swap__route ${activeRoute === i ? 'swap__route--active' : ''}`}
                                    key={i}
                                    onClick={() => setActiveRoute(i)}
                                >
                                    <img
                                        title={aggregatorId}
                                        src={providers[aggregatorId].icon}
                                        alt={aggregatorId}
                                        className="swap__route-exchange"
                                    />:
                                    {getSwapRouteCoin(route[0])}
                                    {getSwapRouteCoin(route[1])}
                                </div>
                                : transactionType === TransactionType.INDIRECT_SWAP
                                    ? <div
                                        className={`swap__route ${activeRoute === i ? 'swap__route--active' : ''}`}
                                        key={i}
                                        onClick={() => setActiveRoute(i)}
                                    >
                                        <img
                                            title={aggregatorId}
                                            src={providers[aggregatorId].icon}
                                            alt={aggregatorId}
                                            className="swap__route-exchange"
                                        />:
                                        {route.map(coin => getSwapRouteCoin(coin))}
                                    </div>
                                    : transactionType === TransactionType.SPLIT_SWAP
                                        ? <div
                                            className={`swap__route ${activeRoute === i ? 'swap__route--active' : ''}`}
                                            key={i}
                                            onClick={() => setActiveRoute(i)}
                                        >
                                            <div className="swap__route-stages">
                                                {aggregatorId.map((id, i) =>
                                                    <div className="swap__route-split" key={id + i}>
                                                        <img
                                                            title={id}
                                                            src={providers[id].icon}
                                                            alt={id}
                                                            className="swap__route-exchange"
                                                        />:
                                                        {route[i].slice(0, -1).map(coin => getSwapRouteCoin(coin))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="swap__route-combine">
                                                <svg className="swap__combine" viewBox="0 0 22 60">
                                                    <use href="#icon--combine" xlinkHref="#icon--combine"></use>
                                                </svg>
                                                {getSwapRouteCoin(route[0][route[0].length - 1])}
                                            </div>
                                        </div>
                                        : '')
                        : ''
                    }

                    <div className="swap__refresh">
                        <div
                            className={`swap__refresh-ticker${isRefreshAnimationActive ? ' ticker--active' : ''}`}
                            style={{animationDuration: parseInt(String((25000 + 30 * refreshCount.current * refreshCount.current) / 1000)) + 's'}}
                        ></div>
                    </div>
                    {(TOKEN_WITH_CUSTOM_FEES_LIST.includes(tokenOne?.solidityAddress) || TOKEN_WITH_CUSTOM_FEES_LIST.includes(tokenTwo?.solidityAddress))
                        ?
                        <div className='swap__warning'><span className='swap__warning-icon'>&#9432;</span> You're
                            exchanging tokens, which has custom fees on token
                            side.
                            Transaction may fail or it can affect output amount.</div>
                        : ''
                    }
                    {getActionButton()}
                </div>
            </div>
        </>
    )
}

export default Swap
