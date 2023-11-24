import { Input, Popover, Radio, Modal, message } from 'antd'
import { ArrowDownOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { BigNumber, ethers } from 'ethers';
import PangolinLogo from '../../assets/img/pangolin.png';
import SaucerSwapLogo from '../../assets/img/saucerswap.ico';
import HeliSwapLogo from '../../assets/img/heliswap.png';
import HSuiteLogo from '../../assets/img/hsuite.png';
import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountAllowanceApproveTransaction, Transaction, TokenId
} from '@hashgraph/sdk';
import axios from 'axios';
import BasicOracleABI from '../../assets/abi/basic-oracle-abi.json';
import { NETWORKS, GAS_LIMITS, HSUITE_NODES } from '../../utils/constants';
import { SmartNodeSocket } from '../../class/smart-node-socket';

function Swap({ wallet, tokens: tokensMap, network, hSuitePools }) {
    const tokens = [...tokensMap]
        .map(wrap => wrap[1])
        .sort((a, b) =>
            a.providers.length > b.providers.length
                ? -1
                : (a.providers.length === b.providers.length
                    ? (a.name > b.name ? 1 : -1)
                    : 1
                )
        );
    const [oracleContracts, setOracleContracts] = useState({
        SaucerSwap: null,
        Pangolin: null,
        HeliSwap: null,
    });
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

    const oracleSettings = () => network === NETWORKS.MAINNET ? {
        SaucerSwap: {
            icon: SaucerSwapLogo,
            aggregatorId: 'SaucerSwap',
            feePromille: 3,
            feeDEXPromille: 3,
            whbar: '0x0000000000000000000000000000000000163b5a',
        },
        Pangolin: {
            icon: PangolinLogo,
            aggregatorId: 'Pangolin',
            feePromille: 3,
            feeDEXPromille: 3,
            whbar: '0x00000000000000000000000000000000001a8837',
        },
        HeliSwap: {
            icon: HeliSwapLogo,
            aggregatorId: 'HeliSwap',
            feePromille: 5,
            feeDEXPromille: 3,
            whbar: '0x00000000000000000000000000000000002cc823',
        },
        HSuite: {
            icon: HSuiteLogo,
            aggregatorId: 'HSuite',
            feePromille: 3,
            feeDEXPromille: 3,
            whbar: '',
        },
    } : {
        SaucerSwap: {
            icon: SaucerSwapLogo,
            aggregatorId: 'SaucerSwap',
            feePromille: 3,
            feeDEXPromille: 3,
            whbar: '0x000000000000000000000000000000000000e6a2',
        },
        Pangolin: {
            icon: PangolinLogo,
            aggregatorId: 'Pangolin',
            feePromille: 3,
            feeDEXPromille: 3,
            whbar: '0x000000000000000000000000000000000002690a',
        },
        HSuite: {
            icon: HSuiteLogo,
            aggregatorId: 'HSuite',
            feePromille: 3,
            feeDEXPromille: 3,
            whbar: '',
        },
    };

    const oracles = () => network === NETWORKS.MAINNET ? {
        SaucerSwap: '0xc47037963fad3a5397cca3fef5c1c95839dc6363',
        Pangolin: '0xfa7206b4c9d46af2e2f7f3b1bd4d3aa2aeca6e71',
        HeliSwap: '0x51851a39da39c53f9b564cfdf7e6f55dc8850225',
    } : {
        SaucerSwap: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
        Pangolin: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
    };

    const exchange = () => network === NETWORKS.MAINNET ? '0.0.3745835' : '0.0.1772118';

    const feeWallet = () => network === NETWORKS.MAINNET ? '0.0.3745833' : '0.0.1772102';

    const hSuiteApiKey = () => network === NETWORKS.MAINNET ? 'd5db1f4a-8791-4f12-925f-920754547ce7' : '25f54dd3-47a1-4667-b9d8-2863585bc460';

    const smartNodeSocket = async () => {
        return new Promise(async (resolve, reject) => {
            if (!wallet?.address) {
                return null;
            }
            try {
                let randomNode = HSUITE_NODES[network][Math.floor(Math.random() * HSUITE_NODES[network].length)];
                let nodeSocket = new SmartNodeSocket(randomNode, wallet.address, hSuiteApiKey());

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

                nodeSocket.getSocket('gateway').connect();
            } catch (error) {
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
                    _tokenA = oracleSettings()[i].whbar;
                }
                if (tokenB === ethers.constants.AddressZero) {
                    _tokenB = oracleSettings()[i].whbar;
                }
                return oracleContracts[i].getRate(_tokenA, _tokenB);
            }),
        ];
        console.log(hSuitePool);
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
            hSuitePriceArr['rate'] = BigNumber.from(balanceB)
                .mul(BigNumber.from('1000000000000000000'))
                .div(BigNumber.from(balanceA));
            hSuitePriceArr['weight'] = sqrt(
                BigNumber
                    .from(balanceA)
                    .mul(balanceB)
            );
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
            .map(name => ({ name, price: prices[name].rate, weight: prices[name].weight }));

        const bestPrice = sortedPrices?.[0]?.price;
        if (parseFloat(bestPrice) === 0) {
            return [];
        }
        const pricesRes = [];
        for (let { name, price, weight } of sortedPrices) {
            if (!price || !tokenOne?.decimals || !tokenTwo?.decimals || !oracleSettings()[name]) {
                continue;
            }

            const priceRes = { price, weight, name };

            const volume = weight.pow(2);
            const Va = sqrt(volume.mul(BigNumber.from(10).pow(18)).div(price));
            const Vb = volume.div(Va);

            if (feeOnTransfer) {
                const amountOut = BigNumber.from(ethers.utils.parseUnits(tokenTwoAmount.toString(), tokenTwo.decimals)).mul(1000 + oracleSettings()[name].feePromille + oracleSettings()[name].feeDEXPromille).div(1000);
                const VaAfter = amountOut.mul(Va).div(Vb.sub(amountOut));
                const priceImpact = amountOut.mul(10000).div(Vb);
                priceRes.amountOut = VaAfter;
                priceRes.priceImpact = priceImpact;
                if (VaAfter.gt(0)) {
                    pricesRes.push(priceRes);
                }
            } else {
                const amountIn = BigNumber.from(ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals)).mul(1000 - oracleSettings()[name].feePromille - oracleSettings()[name].feeDEXPromille).div(1000);
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
            const socketConnection = await smartNodeSocket();
            socketConnection.socket.getSocket('gateway').on('swapPoolRequest', async (resPool) => {
                if (resPool.status == 'success') {
                    let transaction = Transaction.fromBytes(new Uint8Array(resPool.payload.transaction));
                    //TODO: checkTransaction() before sign (make sure summ is correct)

                    let signedTransactionBytes = await wallet.signTransaction(transaction);

                    socketConnection.socket.getSocket('gateway').on('swapPoolExecute', responseEvent => {
                        if (responseEvent.status == 'success') {
                            console.log(`customer has successfully completed the swap.`);
                            socketConnection.socket.getSocket('gateway').disconnect();
                        } else {
                            console.error(responseEvent);
                        }
                    });

                    socketConnection.socket.getSocket('gateway').emit('swapPoolExecute', {
                        type: 'swapPoolExecute',
                        transactionBytes: signedTransactionBytes,
                    });
                }
            });
            let swapObj = {
                baseToken: {
                    details: {
                        id: tokenOne.solidityAddress === ethers.constants.AddressZero ? 'HBAR' : tokenOne.address,
                        symbol: tokenOne.symbol,
                        decimals: tokenOne.decimals,
                    },
                    amount: {
                        value: ethers.utils.formatUnits(
                            ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 - oracleSettings()[bestRate.name].feePromille).div(1000),
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
                            ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - oracleSettings()[bestRate.name].feePromille).div(1000),
                            tokenTwo.decimals
                        )
                    }
                },
            };
            console.log(swapObj);

            socketConnection.socket.getSocket('gateway').emit('swapPoolRequest', {
                type: 'swapPoolRequest',
                senderId: wallet.address,
                swap: swapObj
            });
        } else {
            if (tokenOne.solidityAddress !== ethers.constants.AddressZero) {
                const allowanceTx = await new AccountAllowanceApproveTransaction()
                    .approveTokenAllowance(
                        tokenOne.address,
                        wallet?.address,
                        exchange(),
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
                    .addString(oracleSettings()[bestRate.name].aggregatorId)
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

            await swapTransaction.executeWithSigner(wallet.signer);
        }

        feeOnTransfer ? setTokenTwoAmount(0) : setTokenOneAmount(0);
    }

    useEffect(() => {
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        const provider = new ethers.providers.JsonRpcProvider(`https://${network}.hashio.io/api`);
        setOracleContracts( network === NETWORKS.MAINNET ? {
            SaucerSwap: new ethers.Contract(oracles().SaucerSwap, BasicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles().Pangolin, BasicOracleABI, provider),
            HeliSwap: new ethers.Contract(oracles().HeliSwap, BasicOracleABI, provider),
        } : {
            SaucerSwap: new ethers.Contract(oracles().SaucerSwap, BasicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles().Pangolin, BasicOracleABI, provider),
        });
    }, [wallet, tokensMap]);

    const getBestPriceDescr = () => {
        const bestPrice = getSortedPrices()?.[0];
        return parseFloat(convertPrice(bestPrice?.price))?.toFixed(6);
    }

    const getBestPriceName = () => {
        return getSortedPrices()?.[0]?.name;
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

    useEffect(() => {
        setTokenOne(tokens[0]);
        setTokenTwo(tokens[4]);
        fetchDexSwap(tokens[0]?.solidityAddress, tokens[4]?.solidityAddress)
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
                                            if (oracleSettings()[provider]) {
                                                return <img src={oracleSettings()[provider].icon} alt={provider}
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
                        ? getSortedPrices().map(({ name, price, lowVolume, amountOut, priceImpact }) => <div className='ratesLogo' key={name}>
                            <img className='ratesLogoIcon' title={name} src={oracleSettings()?.[name]?.icon}
                                 alt={name}/> {ethers.utils.formatUnits(amountOut, feeOnTransfer ? tokenOne?.decimals : tokenTwo.decimals)}  (impact: {ethers.utils.formatUnits(priceImpact.toString(), 2)}%)
                        </div>)
                        : ''
                    }
                </div>
                { (tokenOneAmount && tokenTwoAmount)
                    ? feeOnTransfer
                    ? <div>Max to sell: { ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10).div(1000).toString(), tokenOne.decimals) }</div>
                    : <div>Min receive: { ethers.utils.formatUnits(ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - slippage * 10).div(1000).toString(), tokenTwo.decimals) }</div>
                    : ''
                }
                <div className="refreshTicker">
                    <div className={isRefreshAnimationActive ? 'active' : ''} style={{animationDuration: parseInt((25000 + 30 * refreshCount.current * refreshCount.current)/1000).toString() + 's'}}></div>
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
