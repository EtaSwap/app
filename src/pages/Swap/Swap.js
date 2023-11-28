import {Input, Popover, Radio, Modal, message} from 'antd'
import {ArrowDownOutlined, SettingOutlined} from '@ant-design/icons'
import {useState, useEffect, useRef} from 'react'
import {BigNumber, ethers} from 'ethers';
import PangolinLogo from '../../assets/img/pangolin.png';
import SaucerSwapLogo from '../../assets/img/saucerswap.ico';
import HeliSwapLogo from '../../assets/img/heliswap.png';
import HSuiteLogo from '../../assets/img/hsuite.png';
import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountAllowanceApproveTransaction, Transaction, TokenId,
} from '@hashgraph/sdk';
import axios from 'axios';
import BasicOracleABI from '../../assets/abi/basic-oracle-abi.json';
import {NETWORKS, GAS_LIMITS, HSUITE_NODES} from '../../utils/constants';
import {SmartNodeSocket} from '../../class/smart-node-socket';
import {useLoader} from "../../components/Loader/LoaderContext";
import {useToaster} from "../../components/Toaster/ToasterContext";
import {defaultTokens, exchange, hSuiteApiKey, oracles, oracleSettings} from "./swap.utils";

function Swap({wallet, tokens: tokensMap, network, hSuitePools, rate}) {
    const tokens = defaultTokens(tokensMap);
    const [oracleContracts, setOracleContracts] = useState({
        SaucerSwap: null,
        Pangolin: null,
        HeliSwap: null,
    });

    const {loading, showLoader, hideLoader} = useLoader();
    const {showToast} = useToaster();

    const [slippage, setSlippage] = useState(1);
    const [feeOnTransfer, setFeeOnTransfer] = useState(false);
    const [messageApi, contextHolder] = message.useMessage()
    const [tokenOneAmount, setTokenOneAmount] = useState(0)
    const [tokenTwoAmount, setTokenTwoAmount] = useState(0)
    const [tokenOne, setTokenOne] = useState(tokens[1])
    const [tokenTwo, setTokenTwo] = useState(tokens[7])
    const [isOpen, setIsOpen] = useState(false)
    const [checkAllRatesOpen, setCheckAllRatesOpen] = useState(true);
    const [changeToken, setChangeToken] = useState(1)
    const refreshCount = useRef(0);
    const refreshTimer = useRef(0);
    const [isRefreshAnimationActive, setIsRefreshAnimationActive] = useState(false);
    const [searchPhrase, setSearchPhrase] = useState('');
    const [hiddenTokens, setHiddenTokens] = useState([]);
    const [prices, setPrices] = useState({
        SaucerSwap: null,
        Pangolin: null,
        HeliSwap: null,
        HSuite: null,
    });

    const smartNodeSocket = async () => {
        return new Promise(async (resolve, reject) => {
            if (!wallet?.address) {
                return null;
            }
            try {
                showLoader();
                let randomNode = HSUITE_NODES[network][Math.floor(Math.random() * HSUITE_NODES[network].length)];
                let nodeSocket = new SmartNodeSocket(randomNode, wallet.address, hSuiteApiKey(network));

                nodeSocket.getSocket('gateway').on('connect', async () => {
                    console.log(`account ${wallet.address} connected to node ${nodeSocket.getNode().operator}`);
                });

                nodeSocket.getSocket('gateway').on('disconnect', async () => {
                    console.log(`account ${wallet.address} disconnected from node ${nodeSocket.getNode().operator}`);
                });

                nodeSocket.getSocket('gateway').on('errors', async (event) => {
                    console.error('error event', event);
                });

                nodeSocket.getSocket('gateway').on('authenticate', async (event) => {
                    if (event.isValidSignature) {
                        resolve({
                            message: `account ${wallet.address} authenticated to node ${nodeSocket.getNode().operator}, ready to operate with websockets/write operations...`,
                            socket: nodeSocket
                        })
                    } else {
                        reject(new Error(`account ${wallet.address} can't connect to node ${nodeSocket.getNode().operator}, shit happens...`))
                    }
                    console.log(nodeSocket);
                });

                nodeSocket.getSocket('gateway').on('authentication', async (event) => {
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

    const handleSlippage = (e) => {
        setSlippage(e.target.value);
    }

    useEffect(() => {
        if (!feeOnTransfer) {
            const bestReceive = getSortedPrices()?.[0]?.amountOut?.toString();
            if (tokenOneAmount && bestReceive && parseFloat(bestReceive) !== 0) {
                setTokenTwoAmount(ethers.utils.formatUnits(bestReceive, tokenTwo?.decimals));
            } else {
                setTokenTwoAmount(0);
            }
        }
    }, [tokenOneAmount]);

    const changeAmountOne = (e) => {
        setFeeOnTransfer(false);
        const input = e.target.value;
        if (input.match(/^[0-9]{0,10}(?:\.[0-9]{0,8})?$/)) {
            setTokenOneAmount(input ? (['.', '0'].includes(input.charAt(input.length - 1)) ? input : parseFloat(input).toString()) : 0);
        }
    }

    useEffect(() => {
        if (feeOnTransfer) {
            const bestSpend = getSortedPrices()?.[0]?.amountOut?.toString();
            if (tokenTwoAmount && bestSpend && parseFloat(bestSpend) !== 0) {
                setTokenOneAmount(ethers.utils.formatUnits(bestSpend, tokenOne?.decimals));
            } else {
                setTokenOneAmount(0);
            }
        }
    }, [tokenTwoAmount]);

    const changeAmountTwo = (e) => {
        setFeeOnTransfer(true);
        const input = e.target.value;
        if (input.match(/^[0-9]{0,10}(?:\.[0-9]{0,8})?$/)) {
            setTokenTwoAmount(input ? (['.', '0'].includes(input.charAt(input.length - 1)) ? input : parseFloat(input).toString()) : 0);
        }
    }

    const switchTokens = () => {
        setPrices({
            SaucerSwap: null,
            Pangolin: null,
            HeliSwap: null,
            HSuite: null,
        })
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        setTokenOne(tokenTwo);
        setTokenTwo(tokenOne);
        fetchDexSwap(tokenTwo.solidityAddress, tokenOne.solidityAddress)
    }

    const openModal = (token) => {
        setChangeToken(token);
        setIsOpen(true);
    }

    const modifyToken = (i) => {
        setPrices({
            SaucerSwap: null,
            Pangolin: null,
            HeliSwap: null,
            HSuite: null,
        })
        setTokenOneAmount(0)
        setTokenTwoAmount(0)
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

    const fetchDexSwap = async (tokenA, tokenB) => {
        const hSuitePool = hSuitePools[`${tokenA}_${tokenB}`] || hSuitePools[`${tokenB}_${tokenA}`] || null;

        const oraclePromises = [
            ...Object.keys(oracleContracts).map(async i => {
                let _tokenA = tokenA;
                let _tokenB = tokenB;
                if (tokenA === ethers.constants.AddressZero) {
                    _tokenA = oracleSettings(network)[i].whbar;
                }
                if (tokenB === ethers.constants.AddressZero) {
                    _tokenB = oracleSettings(network)[i].whbar;
                }
                return oracleContracts[i].getRate(_tokenA, _tokenB);
            }),
        ];
        if (hSuitePool) {
            oraclePromises.push(axios.get(`https://${network}.mirrornode.hedera.com/api/v1/accounts/${hSuitePool}`));
        }

        const res = await Promise.allSettled(oraclePromises);

        let hSuitePriceArr = null;
        if (res[network === NETWORKS.MAINNET ? 3 : 2]?.status === 'fulfilled') {
            const balance = res[network === NETWORKS.MAINNET ? 3 : 2].value.data.balance;
            let balanceA = 0;
            let balanceB = 0;
            if (tokenA === ethers.constants.AddressZero) {
                balanceA = balance.balance;
            } else {
                const idA = TokenId.fromSolidityAddress(tokenA).toString();
                balanceA = balance.tokens.find(token => token.token_id === idA)?.balance;
            }
            if (tokenB === ethers.constants.AddressZero) {
                balanceB = balance.balance;
            } else {
                const idB = TokenId.fromSolidityAddress(tokenB).toString();
                balanceB = balance.tokens.find(token => token.token_id === idB)?.balance;
            }

            hSuitePriceArr = [];
            hSuitePriceArr['rate'] = BigNumber.from(balanceB).mul(BigNumber.from('1000000000000000000')).div(BigNumber.from(balanceA));
            hSuitePriceArr['weight'] = sqrt(BigNumber.from(balanceA).mul(balanceB));
        }

        setPrices({
            SaucerSwap: res[0].status === 'fulfilled' ? res[0].value : null,
            Pangolin: res[1].status === 'fulfilled' ? res[1].value : null,
            HeliSwap: network === NETWORKS.MAINNET ? (res[2]?.status === 'fulfilled' ? res[2].value : null) : null,
            HSuite: hSuitePriceArr,
        });
    }

    function sqrt(value) {
        const ONE = ethers.BigNumber.from(1);
        const TWO = ethers.BigNumber.from(2);

        const x = ethers.BigNumber.from(value);
        let z = x.add(ONE).div(TWO);
        let y = x;
        while (z.sub(y).isNegative()) {
            y = z;
            z = x.div(z).add(z).div(TWO);
        }
        return y;
    }

    const getSortedPrices = () => {
        const sortedPrices = Object.keys(prices)
            .filter(name => prices[name]?.rate && !prices[name]?.rate?.eq(0))
            .sort((a, b) => prices[b].rate.sub(prices[a].rate))
            .map(name => ({name, price: prices[name].rate, weight: prices[name].weight}));

        const bestPrice = sortedPrices?.[0]?.price;
        if (parseFloat(bestPrice) === 0) {
            return [];
        }
        const pricesRes = [];
        for (let {name, price, weight} of sortedPrices) {
            if (!price || !tokenOne?.decimals || !tokenTwo?.decimals || !oracleSettings(network)[name]) {
                continue;
            }

            const priceRes = {price, weight, name};

            const volume = weight.pow(2);
            const Va = sqrt(volume.mul(BigNumber.from(10).pow(18)).div(price));
            const Vb = volume.div(Va);

            if (feeOnTransfer) {
                const amountOut = BigNumber.from(ethers.utils.parseUnits(tokenTwoAmount.toString(), tokenTwo.decimals)).mul(1000 + oracleSettings(network)[name].feePromille + oracleSettings(network)[name].feeDEXPromille).div(1000);
                const VaAfter = amountOut.mul(Va).div(Vb.sub(amountOut));
                const priceImpact = amountOut.mul(10000).div(Vb);
                priceRes.amountOut = VaAfter;
                priceRes.priceImpact = priceImpact;
                if (VaAfter.gt(0)) {
                    pricesRes.push(priceRes);
                }
            } else {
                const amountIn = BigNumber.from(ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals)).mul(1000 - oracleSettings(network)[name].feePromille - oracleSettings(network)[name].feeDEXPromille).div(1000);
                const VbAfter = amountIn.mul(Vb).div(Va.add(amountIn));
                const priceImpact = VbAfter.mul(10000).div(Vb);
                priceRes.amountOut = VbAfter;
                priceRes.priceImpact = priceImpact;
                pricesRes.push(priceRes);
            }

        }

        return pricesRes.sort((a, b) => feeOnTransfer ? a.amountOut.sub(b.amountOut) : b.amountOut.sub(a.amountOut));
    }

    const convertPrice = (price) => {
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
        return !Object.values(prices).find(price => price?.rate && !price?.rate?.isZero());
    }

    const getGasPrice = (providerName) => {
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

        const bestRate = getSortedPrices()?.[0];
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
            const socketConnection = await smartNodeSocket();
            socketConnection.socket.getSocket('gateway').on('swapPoolRequest', async (resPool) => {
                try {
                    if (resPool.status == 'success') {
                        console.log();
                        let transaction = Transaction.fromBytes(new Uint8Array(resPool.payload.transaction));
                        //TODO: checkTransaction() before sign (make sure summ is correct)

                        let signedTransactionBytes = await wallet.signTransaction(transaction);

                        socketConnection.socket.getSocket('gateway').on('swapPoolExecute', responseEvent => {
                            if (responseEvent.status == 'success') {
                                showToast('Transaction', 'Successfully completed the swap', 'success');
                                socketConnection.socket.getSocket('gateway').disconnect();
                            } else {
                                showToast('Transaction', 'error', 'error');
                            }
                        });

                        socketConnection.socket.getSocket('gateway').emit('swapPoolExecute', {
                            type: 'swapPoolExecute',
                            transactionBytes: signedTransactionBytes,
                        }, (error) => {
                            if (error) {
                                console.log(error, 'Error');
                                showToast('Transaction', 'error', 'error');
                            } else {
                                showToast('Transaction', 'The transaction was successfully processed', 'success');
                            }
                        });
                    } else {
                        showToast('Transaction', resPool.error, 'error');
                    }
                } catch (e) {
                    showToast('Transaction', 'An error occurred', 'error');
                }
            });

            let amountFromHsuite = ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals);
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                amountFromHsuite = amountFromHsuite.mul(1000 - oracleSettings(network)[bestRate.name].feePromille).div(1000);
            } else if (tokenOne.symbol === 'HSUITE') {
                const hSuiteFee = Math.max(10000, amountFromHsuite.mul(oracleSettings(network)[bestRate.name].feeDEXPromille).div(1000).toNumber());
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
                        feeOnTransfer
                            ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10).div(1000).toString()
                            : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString(),
                    )
                    .freezeWithSigner(wallet.signer);
                await allowanceTx.executeWithSigner(wallet.signer);

            }

            let swapTransaction = await new ContractExecuteTransaction()
                .setContractId(exchange())
                .setGas(getGasPrice(bestRate.name))
                .setFunction("swap", new ContractFunctionParameters()
                    .addString(oracleSettings(network)[bestRate.name].aggregatorId)
                    .addAddress(tokenOne.solidityAddress)
                    .addAddress(tokenTwo.solidityAddress)
                    .addUint256(
                        feeOnTransfer
                            ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10).div(1000).toString()
                            : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString()
                    )
                    .addUint256(
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

            const signedTransaction = await swapTransaction.executeWithSigner(wallet.signer);


            if (signedTransaction && signedTransaction.transactionId) {
                const idTransaction = `${signedTransaction.transactionId.substr(0, 4)}${signedTransaction.transactionId.substr(4).replace(/@/, '-').replace('.', '-')}`;
                setTimeout(() => {
                    axios.get(`https://${network}.mirrornode.hedera.com/api/v1/transactions/${idTransaction}`).then(res => {
                        console.log(res.data, 'R!');
                        if (res && res.data && res.data.transactions && res.data.transactions[0].result) {
                            showToast('Transaction', 'The transaction was successfully processed', 'success');
                        } else {
                            showToast('Transaction', 'error', 'error');
                        }
                    }).finally(() => {
                        hideLoader();
                    });
                }, 6000);
            } else {
                showToast('Transaction', 'got some error', 'error');
            }
        }

        feeOnTransfer ? setTokenTwoAmount(0) : setTokenOneAmount(0);
    }

    useEffect(() => {
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        const provider = new ethers.providers.JsonRpcProvider(`https://${network}.hashio.io/api`);
        setOracleContracts(network === NETWORKS.MAINNET ? {
            SaucerSwap: new ethers.Contract(oracles(network).SaucerSwap, BasicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles(network).Pangolin, BasicOracleABI, provider),
            HeliSwap: new ethers.Contract(oracles(network).HeliSwap, BasicOracleABI, provider),
        } : {
            SaucerSwap: new ethers.Contract(oracles(network).SaucerSwap, BasicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles(network).Pangolin, BasicOracleABI, provider),
        });
    }, [wallet, tokensMap]);

    const getBestPriceDescr = () => {
        const bestPrice = getSortedPrices()?.[0];
        return parseFloat(convertPrice(bestPrice?.price))?.toFixed(6);
    }

    const getBestImpactError = () => {
        return (getSortedPrices()?.[0]?.priceImpact || BigNumber.from(0)).gt(2000);
    }

    const swapDisabled = () => {
        const bestPrice = getSortedPrices()?.[0];
        return !tokenOneAmount
            || !wallet?.address
            || !bestPrice?.price
            || bestPrice?.priceImpact?.gt(2000);
    }

    const getNetworkFee = () => {
        const bestPrice = getSortedPrices()?.[0];
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

    useEffect(() => {
        setTokenOne(tokens[0]);
        setTokenTwo(tokens[1]);
        fetchDexSwap(tokens[0]?.solidityAddress, tokens[1]?.solidityAddress)
    }, [oracleContracts]);

    const refreshRate = () => {
        setIsRefreshAnimationActive(false);
        refreshCount.current = refreshCount.current + 2;
        if (tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            fetchDexSwap(tokenOne.solidityAddress, tokenTwo.solidityAddress);
        }
        setTimeout(() => setIsRefreshAnimationActive(true), 0);
        refreshTimer.current = setTimeout(refreshRate, (25000 + 30 * refreshCount.current * refreshCount.current));
    };

    useEffect(() => {
        setIsRefreshAnimationActive(false);
        clearTimeout(refreshTimer.current);
        refreshCount.current = 0;
        if (tokenOne?.solidityAddress && tokenTwo?.solidityAddress) {
            setTimeout(() => setIsRefreshAnimationActive(true), 1500);
        }
        refreshTimer.current = setTimeout(refreshRate, 25000 + 1500);
    }, [tokenOne, tokenTwo]);

    useEffect(() => {
        const lowerCase = searchPhrase.toLowerCase();
        const hiddenTokens = [];
        if (lowerCase) {
            tokens.forEach((token, i) => {
                if (
                    !token.symbol.toLowerCase().includes(lowerCase)
                    && !token.name.toLowerCase().includes(lowerCase)
                    && !token.address.toLowerCase().includes(lowerCase)
                ) {
                    hiddenTokens.push(i);
                }
            });
        }
        setHiddenTokens(hiddenTokens);
    }, [searchPhrase]);

    const settingsContent = (
        <>
            <div>Slippage Tolerance</div>
            <div>
                <Radio.Group onChange={handleSlippage} value={slippage}>
                    <Radio.Button value={0.5}>0.5%</Radio.Button>
                    <Radio.Button value={1}>1%</Radio.Button>
                    <Radio.Button value={1.5}>1.5%</Radio.Button>
                    <Radio.Button value={2}>2%</Radio.Button>
                </Radio.Group>
            </div>
        </>
    )

    return (
        <>
            {contextHolder}
            <Modal open={isOpen} footer={null} onCancel={() => {
                setIsOpen(false)
            }} title="Select a token">
                <div className='modalContent'>
                    <div className="token__search">
                        <Input
                            type='search'
                            className='token__search-field'
                            placeholder='Search by name, address, symbol'
                            onChange={(e) => setSearchPhrase(e.target.value)}
                            value={searchPhrase}
                        />
                    </div>
                    <div className='token__list'>
                        {tokens?.map((token, index) => {
                            return (
                                <div
                                    className={'tokenChoice' + (hiddenTokens.includes(index) ? ' hidden' : '')}
                                    key={index}
                                    onClick={() => modifyToken(index)}
                                >
                                    <img src={token.icon} alt={token.symbol} className="tokenLogo"/>
                                    <div className='tokenChoiceNames'>
                                        <div className='tokenName'>
                                            {token.name}
                                        </div>
                                        <div className='tokenTicker'>
                                            {token.symbol} ({token.address})
                                        </div>
                                    </div>
                                    <div className='tokenChoiceProviders'>
                                        {token.providers.map(provider => {
                                            if (oracleSettings(network)[provider]) {
                                                return <img src={oracleSettings(network)[provider].icon} alt={provider}
                                                            key={provider}/>
                                            }
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </Modal>
            <div className='tradeBox'>
                <div className='tradeBoxHeader'>
                    <h4>Swap</h4>
                    <Popover
                        title='Settings'
                        trigger='click'
                        placement='bottomRight'
                        content={settingsContent}
                    >
                        <SettingOutlined className='cog'/>
                    </Popover>
                </div>
                <div className='inputs'>
                    <div className={feeOnTransfer ? 'approx' : ''}>
                        <Input
                            placeholder='0'
                            value={tokenOneAmount}
                            onChange={changeAmountOne}
                            disabled={isAtLeastOnePrice()}
                        />
                    </div>
                    <div className={feeOnTransfer ? '' : 'approx'}>
                        <Input
                            placeholder='0'
                            value={tokenTwoAmount}
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
                <div className='ratesLogoWrapper'>
                    <div className='ratesLogoInner'>
                        <span className='ratesLogoTop'>Best rate: {getBestPriceDescr()}</span>
                        <button className='ratesLogoToggle'
                                onClick={() => switchAllRates()}>{checkAllRatesOpen ? 'Hide all rates' : 'Show all rates'}</button>
                    </div>
                    {checkAllRatesOpen
                        ? getSortedPrices().map(({name, price, lowVolume, amountOut, priceImpact}) => <div
                            className='ratesLogo' key={name}>
                            <img className='ratesLogoIcon' title={name} src={oracleSettings(network)?.[name]?.icon}
                                 alt={name}/> {ethers.utils.formatUnits(amountOut, feeOnTransfer ? tokenOne?.decimals : tokenTwo.decimals)} (impact: {ethers.utils.formatUnits(priceImpact.toString(), 2)}%)
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
                {network === NETWORKS.TESTNET ?
                    <div className='networkFee'>Network fee: ≈{getNetworkFee().toFixed(4)} HBAR</div> : ''}
                <div className="refreshTicker">
                    <div className={isRefreshAnimationActive ? 'active' : ''}
                         style={{animationDuration: parseInt((25000 + 30 * refreshCount.current * refreshCount.current) / 1000).toString() + 's'}}></div>
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
