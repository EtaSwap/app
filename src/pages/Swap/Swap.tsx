import { Input, Popover, message } from 'antd'
import { ArrowDownOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { BigNumber, ethers } from 'ethers';
import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountAllowanceApproveTransaction, Transaction, TransferTransaction, Hbar, HbarUnit,
} from '@hashgraph/sdk';
import axios from 'axios';
import BasicOracleABI from '../../assets/abi/basic-oracle-abi.json';
import { NETWORKS, GAS_LIMITS, HSUITE_NODES, getHSuiteInfo } from '../../utils/constants';
import { SmartNodeSocket } from '../../class/smart-node-socket';
import { useLoader } from "../../components/Loader/LoaderContext";
import { useToaster } from "../../components/Toaster/ToasterContext";
import {
    defaultOracleContracts,
    defaultPrices,
    defaultTokens,
    exchange,
    fetchRates,
    filterUniqueTokens
} from "./swap.utils";
import { SlippageTolerance } from "./Components/SlippageTolerance/SlippageTolerance";
import { TokensModal } from "./Components/TokensModal/TokensModal";
import { toastTypes } from "../../models/Toast";
import { Token } from '../../types/token';
import { Provider } from '../../class/providers/provider';
import {typeWallet} from "../../models";
import useDebounce from "../../hooks/useDebounce";
import { PriceOutput } from '../../class/providers/types/price-output';
import { Price } from '../../class/providers/types/price';
import AssociateNewToken from "./Components/AssociateNewToken/AssociateNewToken";
import {TokenBalanceJson} from "@hashgraph/sdk/lib/account/AccountBalance";
import { SortedPrice } from '../../class/providers/types/sorted-price';

export interface ISwapProps {
    wallet: any;
    tokens: Map<string, Token>;
    network: string;
    rate: number | null;
    providers: Record<string, Provider>;
}

function Swap({ wallet, tokens: tokensMap, network, rate, providers }: ISwapProps) {
    const { loading, showLoader, hideLoader } = useLoader();
    const { showToast } = useToaster();

    const tokens = defaultTokens(tokensMap);
    const [tokenOneAmountInput, setTokenOneAmountInput] = useState<any>(0);
    const [tokenTwoAmountInput, setTokenTwoAmountInput] = useState<any>(0);
    const [tokenOneAmount, setTokenOneAmount] = useState<any>(0);
    const [tokenTwoAmount, setTokenTwoAmount] = useState<any>(0);
    const [tokenOne, setTokenOne] = useState(tokens[0]);
    const [tokenTwo, setTokenTwo] = useState(tokens[4]);

    const debouncedTokenOneAmountInput: string = useDebounce(tokenOneAmountInput, 500);
    const debouncedTokenTwoAmountInput: string = useDebounce(tokenTwoAmountInput, 500);
    const [oracleContracts, setOracleContracts] = useState<any>(defaultOracleContracts);
    const [associatedButtons, setAssociatedButtons] = useState<Token[]>([]);
    const [slippage, setSlippage] = useState(1);
    const [feeOnTransfer, setFeeOnTransfer] = useState<boolean>(false);
    const [messageApi, contextHolder] = message.useMessage()
    const [isOpen, setIsOpen] = useState(false)
    const [checkAllRatesOpen, setCheckAllRatesOpen] = useState(true);
    const [changeToken, setChangeToken] = useState<any>(1)
    const refreshCount = useRef(0);
    const refreshTimer = useRef<any>(0);
    const [isRefreshAnimationActive, setIsRefreshAnimationActive] = useState(false);
    const [searchPhrase, setSearchPhrase] = useState('');
    const [hiddenTokens, setHiddenTokens] = useState([]);
    const [prices, setPrices] = useState<Record<string, Price | null>>(defaultPrices);
    const [sortedPrices, setSortedPrices] = useState<PriceOutput[]>([]);

    const smartNodeSocket = async () => {
        return new Promise(async (resolve, reject) => {
            if (!wallet?.address) {
                return null;
            }
            try {
                showLoader();
                let randomNode = HSUITE_NODES[network][Math.floor(Math.random() * HSUITE_NODES[network].length)];
                let nodeSocket: any = new SmartNodeSocket(randomNode, wallet.address, providers.HSuite.getApiKey(network));

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
                        reject(new Error(`account ${wallet.address} can't connect to node ${nodeSocket.getNode().operator}, shit happens...`))
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

    const changeAmountOne = (e: any) => {
        if (feeOnTransfer) {
            setFeeOnTransfer(false);
        }
        const input = e.target.value;
        if (input.match(/^[0-9]{0,10}(?:\.[0-9]{0,8})?$/)) {
            setTokenOneAmountInput(input ? (['.', '0'].includes(input.charAt(input.length - 1)) ? input : parseFloat(input).toString()) : 0);
        }
    }


    const changeAmountTwo = (e: any) => {
        if (!feeOnTransfer) {
            setFeeOnTransfer(true);
        }
        const input = e.target.value;
        if (input.match(/^[0-9]{0,10}(?:\.[0-9]{0,8})?$/)) {
            setTokenTwoAmountInput(input ? (['.', '0'].includes(input.charAt(input.length - 1)) ? input : parseFloat(input).toString()) : 0);
        }
    }

    const switchTokens = () => {
        setPrices({
            SaucerSwap: null,
            Pangolin: null,
            HeliSwap: null,
            HSuite: null,
        });
        setTokenOneAmountInput(0);
        setTokenTwoAmountInput(0);
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        setTokenOne(tokenTwo);
        setTokenTwo(tokenOne);
        fetchDexSwap(tokenTwo.solidityAddress, tokenOne.solidityAddress)
    }

    const openModal = (token: number) => {
        setChangeToken(token);
        setIsOpen(true);
    }

    const modifyToken = (i: any) => {
        setPrices({
            SaucerSwap: null,
            Pangolin: null,
            HeliSwap: null,
            HSuite: null,
        })
        setTokenOneAmountInput(0);
        setTokenTwoAmountInput(0);
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        if (changeToken === 1) {
            setTokenOne(tokens[i])
            fetchDexSwap(tokens[i].solidityAddress, tokenTwo.solidityAddress)
        } else {
            setTokenTwo(tokens[i])
            fetchDexSwap(tokenOne.solidityAddress, tokens[i].solidityAddress)
        }
        setIsOpen(false);
        setSearchPhrase('');
    }

    const fetchDexSwap = async (tokenA: any, tokenB: any, isLoader = true) => {
        if (isLoader) {
            showLoader();
        }
        const result = await fetchRates(tokenA, tokenB, network, oracleContracts, providers);

        setPrices(result);
    }

    const convertPrice = (price: any) => {
        if (!price || !tokenOne || !tokenTwo) {
            return '0';
        }
        const decimalsDiff = tokenOne.decimals - tokenTwo.decimals;
        return ethers.utils.formatEther(decimalsDiff > 0 ? price.mul(Math.pow(10, decimalsDiff)) : price.div(Math.pow(10, Math.abs(decimalsDiff))));
    }

    const switchAllRates = () => {
        setCheckAllRatesOpen(!checkAllRatesOpen);
    }

    const isAtLeastOnePrice = () => {
        return !Object.values(prices).find((price: any) => price?.rate && !price?.rate?.isZero());
    }

    const getGasPrice = (providerName: any) => {
        if (!tokenOne || !tokenTwo) {
            return 0;
        }
        if (feeOnTransfer) {
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS[providerName].HBARToExactToken;
            } else if (tokenTwo.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS[providerName].tokenToExactHBAR;
            } else {
                return GAS_LIMITS[providerName].tokenToExactToken;
            }
        } else {
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS[providerName].exactHBARToToken;
            } else if (tokenTwo.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS[providerName].exactTokenToHBAR;
            } else {
                return GAS_LIMITS[providerName].exactTokenToToken;
            }
        }
    }

    const fetchDex = async () => {
        const deadline = Math.floor(Date.now() / 1000) + 1000;

        const bestRate = sortedPrices?.[0];
        if (!bestRate?.price || bestRate.price.eq(0)) {
            messageApi.open({
                type: 'error',
                content: 'Failed to fetch rate',
                duration: 2
            });
            return null;
        }

        if (bestRate.name === 'HSuite') {
            showLoader();
            const socketConnection: any = await smartNodeSocket();
            socketConnection.socket.getSocket('gateway').on('swapPoolRequest', async (resPool: any) => {
                try {
                    if (resPool.status === 'success') {
                        let transaction: TransferTransaction = Transaction.fromBytes(new Uint8Array(resPool.payload.transaction)) as TransferTransaction;
                        const minToReceive = ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - slippage * 10).div(1000);
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
                                showToast('Transaction', `The transaction was successfully processed. Transaction ID: ${responseEvent.payload?.transaction?.transactionId}`, toastTypes.success);
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
                    showToast('Transaction', 'An unknown error occurred.', toastTypes.error);
                }
            });

            let amountFromHsuite = ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals);
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                amountFromHsuite = amountFromHsuite.mul(1000 - providers[bestRate.name].feePromille).div(1000);
            } else if (tokenOne.symbol === 'HSUITE') {
                const hSuiteFee = Math.max(10000, amountFromHsuite.mul(providers[bestRate.name].feeDEXPromille).div(1000).toNumber());
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
                            ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals),
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
                        exchange(network),
                        // @ts-ignore
                        feeOnTransfer
                            ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10).div(1000).toString()
                            : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString(),
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
            await new Promise(resolve => setTimeout(resolve, 500));

            let swapTransaction = await new ContractExecuteTransaction()
                .setContractId(exchange(network))
                .setGas(getGasPrice(bestRate.name))
                .setFunction("swap", new ContractFunctionParameters()
                    .addString(providers[bestRate.name].aggregatorId)
                    .addAddress(tokenOne.solidityAddress)
                    .addAddress(tokenTwo.solidityAddress)
                    .addUint256(
                        // @ts-ignore
                        feeOnTransfer
                            ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10).div(1000).toString()
                            : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString()
                    )
                    .addUint256(
                        // @ts-ignore
                        feeOnTransfer
                            ? ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).toString()
                            : ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - slippage * 10).div(1000).toString()
                    )
                    .addUint256(deadline)
                    .addBool(feeOnTransfer)
                )
                .setPayableAmount(tokenOne.solidityAddress === ethers.constants.AddressZero
                    ? (feeOnTransfer
                            ? ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, 8).mul(1000 + slippage * 10).div(1000), 8)
                            : ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, 8), 8)
                    )
                    : 0)
                .freezeWithSigner(wallet.signer);

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
                const idTransaction = `${execTransaction.res.transactionId.substr(0, 4)}${execTransaction.res.transactionId.substr(4).replace(/@/, '-').replace('.', '-')}`;
                setTimeout(() => {
                    axios.get(`https://${network}.mirrornode.hedera.com/api/v1/transactions/${idTransaction}`).then(res => {
                        if (res?.data?.transactions?.[0]?.result) {
                            showToast('Transaction', `The transaction was successfully processed. Transaction ID: ${execTransaction.res.transactionId}`, toastTypes.success);
                        } else {
                            showToast('Transaction', 'Error on processing transaction', toastTypes.error);
                        }
                    }).finally(() => {
                        hideLoader();
                    });
                }, 6000);
            } else {
                console.error('Empty/incorrect transaction response');
                showToast('Transaction', 'An unknown error occurred.', toastTypes.error);
            }
        }

        setTokenOneAmountInput(0);
        setTokenTwoAmountInput(0);
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
    }

    const getBestPriceDescr = () => {
        const bestPrice = sortedPrices?.[0];
        return parseFloat(convertPrice(bestPrice?.price))?.toFixed(6);
    }

    const getBestImpactError = () => {
        return (sortedPrices?.[0]?.priceImpact || BigNumber.from(0)).gt(2000);
    }

    const swapDisabled = () => {
        const bestPrice = sortedPrices?.[0];
        let isAnyUnassociatedTokens = false;
        if(wallet.associatedTokens && tokenOne && tokenTwo){
            const findHSuite = sortedPrices && sortedPrices.length > 0 ? bestPrice?.name === providers.HSuite.aggregatorId : false;

            if(!(wallet.associatedTokens?.find((e: TokenBalanceJson) => e.tokenId === tokenOne.address)) && tokenOne.symbol !== typeWallet.HBAR ||
                !(wallet.associatedTokens?.find((e: TokenBalanceJson) => e.tokenId === tokenTwo.address)) && tokenTwo.symbol !== typeWallet.HBAR){
                isAnyUnassociatedTokens = true;
            }

            if(findHSuite){
                if(!(wallet.associatedTokens?.find((e: TokenBalanceJson) => e.tokenId === getHSuiteInfo(network).address))){
                    isAnyUnassociatedTokens = true;
                }
            }
        }

        return !tokenOneAmount
            || isAnyUnassociatedTokens
            || !wallet?.address
            || !bestPrice?.price
            || bestPrice?.priceImpact?.gt(2000);
    }

    const getNetworkFee = () => {
        const bestPrice = sortedPrices?.[0];
        if (!rate || !tokenOne || !tokenTwo || !bestPrice?.name) {
            return 0;
        }
        if (bestPrice.name === 'HSuite') {
            return rate * 0.0016;
        }
        const gasPrice = getGasPrice(bestPrice.name);
        if (gasPrice === 0) {
            return 0;
        }
        const approxCost1Gas = 0.000000082;
        return rate * gasPrice * approxCost1Gas;
    }

    const refreshRate = () => {
        setIsRefreshAnimationActive(false);
        refreshCount.current = refreshCount.current + 2;
        if (tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            fetchDexSwap(tokenOne.solidityAddress, tokenTwo.solidityAddress, false);
        }
        setTimeout(() => setIsRefreshAnimationActive(true), 0);
        refreshTimer.current = setTimeout(refreshRate, (25000 + 30 * refreshCount.current * refreshCount.current));
    };
    const associateToken = async (token: Token) => {
        showLoader();
        const result = await wallet.associateNewToken(token.address);

        if(result){
            if(result.error){
                if(result.error === "USER_REJECT") {
                    showToast('Associate Token', `Token ${token.name} association was rejected.`, toastTypes.error);
                }else if(result.error.includes('precheck with status')){
                    showToast('Associate token', result.error, toastTypes.error);
                } else if(result.error.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')){
                    // "receipt for transaction 0.0.5948290@1703145822.184660155 contained error status TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT"
                    showToast('Associate Token', result.error, toastTypes.error);
                } else {
                    showToast('Error', `An unknown error occurred`, toastTypes.error);
                }
            } else if(result?.res?.nodeId) {
                showToast('Associate Token', `Token ${token.name} associated to account`, toastTypes.success);
            }
        } else {
            showToast('Error', `An unknown error occurred.`, toastTypes.error);
        }
        wallet.updateBalance(true);
        checkAssociateTokens();
        hideLoader();
    }

    const checkAssociateTokens = () => {
        if(wallet && wallet.signer === null) {
            setAssociatedButtons([]);
            return;
        }
        if(wallet.associatedTokens !== null && tokenOne && tokenTwo){
            const findHSuite = sortedPrices && sortedPrices.length > 0 ? sortedPrices[0].name === getHSuiteInfo(network).name : false;
            let tokens: Token[] = [];
            if(!(wallet.associatedTokens?.find((e: TokenBalanceJson) => e.tokenId === tokenOne.address)) && tokenOne.symbol !== typeWallet.HBAR){
                tokens.push({...tokenOne});
            }
            if(!(wallet.associatedTokens?.find((e: TokenBalanceJson) => e.tokenId === tokenTwo.address)) && tokenTwo.symbol !== typeWallet.HBAR){
                tokens.push({...tokenTwo});
            }
            if(findHSuite){
                if(!(wallet.associatedTokens?.find((e: TokenBalanceJson) => e.tokenId === getHSuiteInfo(network).address))){
                    tokens.push(getHSuiteInfo(network));
                }
            }
            const uniqueArray = filterUniqueTokens(tokens);
            setAssociatedButtons(uniqueArray);
        }
    }

    const getSortedPrices = async (): Promise<PriceOutput[]> => {
        showLoader();

        const sortedPrices: SortedPrice[] = Object.keys(prices)
            .filter(name => prices[name]?.rate && !prices[name]?.rate?.eq(0))
            .sort((a, b) => prices[b]!.rate!.sub(prices[a]!.rate!).toString() as any)
            .map(name => ({name, price: prices[name]!.rate!, weight: prices[name]!.weight!}));

        const bestPrice = sortedPrices?.[0]?.price;
        if (!bestPrice || parseFloat(bestPrice.toString()) === 0) {
            hideLoader();
            return [];
        }
        const priceResPromises: Promise<PriceOutput | null>[] = [];
        for (let sortedPrice of sortedPrices) {
            if (!sortedPrice.price || !tokenOne?.decimals || !tokenTwo?.decimals) {
                continue;
            }

            priceResPromises.push(providers[sortedPrice.name].getPriceOutput(
                sortedPrice,
                tokenOne,
                tokenTwo,
                tokenOneAmount,
                tokenTwoAmount,
                feeOnTransfer,
                network,
            ));
        }

        const pricesRes = (await Promise.all(priceResPromises)).filter((price): price is PriceOutput => price !== null);
        hideLoader();
        return pricesRes.sort((a: any, b: any) => feeOnTransfer ? a.amountOut.sub(b.amountOut) : b.amountOut.sub(a.amountOut));
    }

    useEffect(() => {
        getSortedPrices().then((res: any[]) => { setSortedPrices(res) });
    }, [prices, tokenOneAmount, tokenTwoAmount]);

    useEffect(() => {
        const bestAmountOut = sortedPrices?.[0]?.amountOut?.toString();
        if (feeOnTransfer) {
            if (tokenTwoAmount && bestAmountOut && parseFloat(bestAmountOut) !== 0) {
                setTokenOneAmountInput(ethers.utils.formatUnits(bestAmountOut, tokenOne?.decimals));
            } else {
                setTokenOneAmountInput(0);
            }
        } else {
            if (tokenOneAmount && bestAmountOut && parseFloat(bestAmountOut) !== 0) {
                setTokenTwoAmountInput(ethers.utils.formatUnits(bestAmountOut, tokenTwo?.decimals));
            } else {
                setTokenTwoAmountInput(0);
            }
        }
    }, [sortedPrices]);

    useEffect(() => {
        if (debouncedTokenTwoAmountInput) {
            setTokenTwoAmount(debouncedTokenTwoAmountInput);
        }
    }, [debouncedTokenTwoAmountInput]);
    useEffect(() => {
        if (debouncedTokenOneAmountInput) {
            setTokenOneAmount(debouncedTokenOneAmountInput);
        }
    }, [debouncedTokenOneAmountInput]);

    useEffect(() => {
        checkAssociateTokens();
    },[tokenOne, tokenTwo, tokenOneAmountInput, tokenTwoAmountInput, sortedPrices, wallet.signer, wallet.associatedTokens]);

    useEffect(() => {
        setTokenOne(tokens[0]);
        setTokenTwo(tokens[4]);
        fetchDexSwap(tokens[0]?.solidityAddress, tokens[4]?.solidityAddress)
    }, [oracleContracts]);

    useEffect(() => {
        setTokenOneAmountInput(0);
        setTokenTwoAmountInput(0);
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        const provider = new ethers.providers.JsonRpcProvider(`https://${network}.hashio.io/api`);
        setOracleContracts(network === NETWORKS.MAINNET ? {
            SaucerSwap: new ethers.Contract(providers.SaucerSwap.getOracle(network)!, BasicOracleABI, provider),
            Pangolin: new ethers.Contract(providers.Pangolin.getOracle(network)!, BasicOracleABI, provider),
            HeliSwap: new ethers.Contract(providers.HeliSwap.getOracle(network)!, BasicOracleABI, provider),
        } : {
            SaucerSwap: new ethers.Contract(providers.SaucerSwap.getOracle(network)!, BasicOracleABI, provider),
            Pangolin: new ethers.Contract(providers.Pangolin.getOracle(network)!, BasicOracleABI, provider),
        });

    }, [wallet, tokensMap]);


    useEffect(() => {
        setIsRefreshAnimationActive(false);
        clearTimeout(refreshTimer.current);
        refreshCount.current = 0;
        if (tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            setTimeout(() => setIsRefreshAnimationActive(true), 1500);
        }
        refreshTimer.current = setTimeout(refreshRate, 25000 + 1500);
    }, [tokenOne, tokenTwo]);

    return (
        <>
            {contextHolder}
            <TokensModal
                hiddenTokens={hiddenTokens}
                modifyToken={modifyToken}
                tokens={tokens}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                searchPhrase={searchPhrase}
                setSearchPhrase={setSearchPhrase}
                setHiddenTokens={setHiddenTokens}
                network={network}
                providers={providers}
            />
            <div className='tradeBox'>
                <div className='tradeBoxHeader'>
                    <h4>Swap</h4>
                    <SlippageTolerance handleSlippage={handleSlippage} slippage={slippage}/>
                </div>
                <div className='inputs'>
                    <div className={feeOnTransfer ? 'approx' : ''}>
                        <Input
                            placeholder='0'
                            value={tokenOneAmountInput}
                            onChange={changeAmountOne}
                            disabled={isAtLeastOnePrice()}
                        />
                    </div>
                    <div className={feeOnTransfer ? '' : 'approx'}>
                        <Input
                            placeholder='0'
                            value={tokenTwoAmountInput}
                            onChange={changeAmountTwo}
                            disabled={isAtLeastOnePrice()}
                        />
                    </div>
                    <div className="switchButton" onClick={switchTokens}>
                        <ArrowDownOutlined className='switchArrow'/>
                    </div>
                    <div className='assetOne' onClick={() => openModal(1)}>
                        <img src={tokenOne?.icon} alt="assetOnelogo" className='logo'/>
                        {tokenOne?.symbol}
                    </div>
                    <div className='assetTwo' onClick={() => openModal(2)}>
                        <img src={tokenTwo?.icon} alt="assetTwologo" className='logo'/>
                        {tokenTwo?.symbol}
                    </div>
                </div>
                <AssociateNewToken handleClick={associateToken} associatedButtons={associatedButtons}/>

                <div className='ratesLogoWrapper'>
                    <div className='ratesLogoInner'>
                        <span className='ratesLogoTop'>Best rate: {getBestPriceDescr()}</span>
                        <button className='ratesLogoToggle'
                                onClick={() => switchAllRates()}>{checkAllRatesOpen ? 'Hide all rates' : 'Show all rates'}</button>
                    </div>
                    {checkAllRatesOpen
                        ? sortedPrices.map(({ name, amountOut, priceImpact, extension }: any) =>
                            <div
                                className='ratesLogo' key={name}>
                                <img className='ratesLogoIcon' title={name} src={providers[name].icon} alt={name}/>
                                {ethers.utils.formatUnits(amountOut, feeOnTransfer ? tokenOne?.decimals : tokenTwo.decimals)}
                                (impact: {ethers.utils.formatUnits(priceImpact.toString(), 2)}%)
                                {extension ? `(${extension})` : ''}
                            </div>)
                        : ''
                    }
                </div>
                {(tokenOneAmount && tokenTwoAmount)
                    ? feeOnTransfer
                        ? <div>Max to
                            sell: {ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10).div(1000).toString(), tokenOne.decimals)}</div>
                        : <div>Min
                            receive: {ethers.utils.formatUnits(ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - slippage * 10).div(1000).toString(), tokenTwo.decimals)}</div>
                    : ''
                }
                <div className='networkFee'>Network fee: ≈{getNetworkFee().toFixed(4)} HBAR</div>
                <div className="refreshTicker">
                    <div className={isRefreshAnimationActive ? 'active' : ''}
                         style={{ animationDuration: parseInt(String((25000 + 30 * refreshCount.current * refreshCount.current) / 1000)) + 's' }}></div>
                </div>
                <div className='assocWarning'>&#9432; Make sure selected tokens are associated to your account.</div>
                {getBestImpactError()
                    ? <div className='impactError'>&#9888; Price impact too high (lack of liquidity).</div>
                    : ''
                }
                <>
                </>

                <button className='swapButton' onClick={fetchDex} disabled={swapDisabled()}>
                    Swap
                </button>
            </div>
        </>
    )
}

export default Swap
