import { Input, Popover, Radio, Modal, message } from 'antd'
import { ArrowDownOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { mainnet, useSendTransaction, useWaitForTransaction } from "wagmi"
import { ethers } from 'ethers';
import PangolinLogo from '../img/pangolin.png';
import SaucerSwapLogo from '../img/saucerswap.ico';
import HeliSwapLogo from '../img/heliswap.png';
import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    TransactionReceipt,
    AccountAllowanceApproveTransaction
} from '@hashgraph/sdk';

const GAS_LIMITS = {
    exactTokenToToken: 900000, //877969    875079
    exactHBARToToken: 245000, //221207     203366
    exactTokenToHBAR: 1670000, //1629306   1623679
    tokenToExactToken: 920000, //894071    891182
    HBARToExactToken: 235000, //211040     218135
    tokenToExactHBAR: 1690000, //1645353   1639941
};

const exchange = '0.0.1173826';

const basicOracleABI = [
    {
        "inputs": [],
        "name": "ConnectorShouldBeNone",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "PoolNotFound",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "PoolWithConnectorNotFound",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "contract IERC20",
                "name": "srcToken",
                "type": "address"
            },
            {
                "internalType": "contract IERC20",
                "name": "dstToken",
                "type": "address"
            }
        ],
        "name": "getRate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "rate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "weight",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

function Swap(props) {
    const { address, tokens: tokensMap, connect, connectionData, signer, network } = props;
    const tokens = [...tokensMap].map(wrap => wrap[1]);
    const [oracleContracts, setOracleContracts] = useState({
        SaucerSwap: null,
        Pangolin: null,
        HeliSwap: null,
    });
    const [slippage, setSlippage] = useState(2.5);
    const [feeOnTransfer, setFeeOnTransfer] = useState(false);
    const [messageApi, contextHolder] = message.useMessage()
    const [tokenOneAmount, setTokenOneAmount] = useState(0)
    const [tokenTwoAmount, setTokenTwoAmount] = useState(0)
    const [tokenOne, setTokenOne] = useState(tokens[1])
    const [tokenTwo, setTokenTwo] = useState(tokens[7])
    const [isOpen, setIsOpen] = useState(false)
    const [checkAllRatesOpen, setCheckAllRatesOpen] = useState(true);
    const [changeToken, setChangeToken] = useState(1)
    const [prices, setPrices] = useState({
        SaucerSwap: null,
        Pangolin: null,
        HeliSwap: null,
    })
    const [txDetails, setTxDetails] = useState({
        to: null,
        data: null,
        value: null
    })

    const { data, sendTransaction } = useSendTransaction({
        request: {
            from: address,
            to: String(txDetails.to),
            data: String(txDetails.data),
            value: String(txDetails.value)
        }
    })

    const oracleSettings = () => network === 'mainnet' ? {
        SaucerSwap: { icon: SaucerSwapLogo, aggregatorId: 'SaucerSwapV2', feePromille: 3, whbar: '0x0000000000000000000000000000000000163b59' },
        Pangolin: { icon: PangolinLogo, aggregatorId: 'Pangolin', feePromille: 3, whbar: '0x00000000000000000000000000000000001a8837' },
        HeliSwap: { icon: HeliSwapLogo, aggregatorId: 'HeliSwap', feePromille: 5, whbar: '0x00000000000000000000000000000000002cc823' },
    } : {
        SaucerSwap: { icon: SaucerSwapLogo, aggregatorId: 'SaucerSwapV2', feePromille: 3, whbar: '0x000000000000000000000000000000000000e6a2' },
        Pangolin: { icon: PangolinLogo, aggregatorId: 'Pangolin', feePromille: 3, whbar: '0x000000000000000000000000000000000002690a' },
    };

    const oracles = () => network === 'mainnet' ? {
        SaucerSwap: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
        Pangolin: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
        HeliSwap: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
    } : {
        SaucerSwap: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
        Pangolin: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
    };

    const { isLoading, isSuccess } = useWaitForTransaction({
        hash: data?.hash
    })

    const handleSlippage = (e) => {
        setSlippage(e.target.value)
    }

    const changeAmountOne = (e) => {
        setTokenOneAmount(e.target.value)
        const bestPrice = convertPrice(getSortedPrices()[0].price);
        if (e.target.value && parseFloat(bestPrice) !== 0) {
            setTokenTwoAmount((e.target.value * parseFloat(bestPrice)).toFixed(5))
        } else {
            setTokenTwoAmount(0);
        }
        setFeeOnTransfer(false);
    }

    const changeAmountTwo = (e) => {
        setTokenTwoAmount(e.target.value)
        const bestPrice = convertPrice(getSortedPrices()[0].price);
        if (e.target.value && parseFloat(bestPrice) !== 0) {
            setTokenOneAmount((e.target.value / parseFloat(bestPrice)).toFixed(5))
        } else {
            setTokenOneAmount(0);
        }
        setFeeOnTransfer(true);
    }

    const switchTokens = () => {
        setPrices({
            SaucerSwap: null,
            Pangolin: null,
            HeliSwap: null,
        })
        setTokenOneAmount(0)
        setTokenTwoAmount(0)
        setTokenOne(tokenTwo)
        setTokenTwo(tokenOne)
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
        setIsOpen(false)
    }

    const fetchDexSwap = async (tokenA, tokenB) => {
        const res = await Promise.allSettled(Object.keys(oracleContracts).map(async i => {
            let _tokenA = tokenA;
            let _tokenB = tokenB;
            if (tokenA === ethers.constants.AddressZero) {
                _tokenA = oracleSettings()[i].whbar;
            }
            if (tokenB === ethers.constants.AddressZero) {
                _tokenB = oracleSettings()[i].whbar;
            }
            return oracleContracts[i].getRate(_tokenA, _tokenB);
        }));

        setPrices({
            SaucerSwap: res[0].status === 'fulfilled' ? res[0].value.rate : null,
            Pangolin: res[1].status === 'fulfilled' ? res[1].value.rate : null,
            HeliSwap: null,
        });
    }

    const getSortedPrices = () => {
        return Object.keys(prices)
            .filter(name => prices[name] && !prices[name]?.eq(0))
            .sort((a, b) => prices[b].sub(prices[a]))
            .map(name => ({ name, price: prices[name] }));
    }

    const convertPrice = (price) => {
        if (!price) {
            return '0';
        }
        const decimalsDiff = tokenOne.decimals - tokenTwo.decimals;
        return ethers.utils.formatEther(decimalsDiff > 0 ? price.mul(Math.pow(10, decimalsDiff)) : price.div(Math.pow(10, Math.abs(decimalsDiff))));
    }

    const switchAllRates = () => {
        setCheckAllRatesOpen(!checkAllRatesOpen);
    }

    const isAtLeastOnePrice = () => {
        return !Object.values(prices).find(price => !price?.isZero());
    }

    const getGasPrice = () => {
        if (!tokenOne || !tokenTwo) {
            return 0;
        }
        if (feeOnTransfer) {
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS.HBARToExactToken;
            } else if (tokenTwo.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS.tokenToExactHBAR;
            } else {
                return GAS_LIMITS.tokenToExactToken;
            }
        } else {
            if (tokenOne.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS.exactHBARToToken;
            } else if (tokenTwo.solidityAddress === ethers.constants.AddressZero) {
                return GAS_LIMITS.exactTokenToHBAR;
            } else {
                return GAS_LIMITS.exactTokenToToken;
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

        if (tokenOne.solidityAddress !== ethers.constants.AddressZero) {
            const allowanceTx = await new AccountAllowanceApproveTransaction()
                .approveTokenAllowance(
                    tokenOne.address,
                    connectionData?.accountIds?.[0],
                    exchange,
                    feeOnTransfer
                        ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10 + oracleSettings()[bestRate.name].feePromille).div(1000).toString()
                        : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString(),
                )
                .freezeWithSigner(signer);
            await allowanceTx.executeWithSigner(signer);
        }

        let swapTransaction = await new ContractExecuteTransaction()
            .setContractId(exchange)
            .setGas(getGasPrice())
            .setFunction("swap", new ContractFunctionParameters()
                .addString(oracleSettings()[bestRate.name].aggregatorId)
                .addAddress(tokenOne.solidityAddress)
                .addAddress(tokenTwo.solidityAddress)
                .addUint256(
                    feeOnTransfer
                        ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10 + oracleSettings()[bestRate.name].feePromille).div(1000).toString()
                        : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString()
                )
                .addUint256(
                    feeOnTransfer
                        ? ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).toString()
                        : ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - slippage * 10 - oracleSettings()[bestRate.name].feePromille).div(1000).toString()
                )
                .addUint256(deadline)
                .addBool(feeOnTransfer)
            )
            .setPayableAmount(tokenOne.solidityAddress === ethers.constants.AddressZero
                ? (feeOnTransfer
                    ? ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, 8).mul(1000 + slippage * 10 + oracleSettings()[bestRate.name].feePromille).div(1000), 8)
                    : ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, 8), 8)
                )
                : 0)
            .freezeWithSigner(signer);

        await swapTransaction.executeWithSigner(signer);
    }

    useEffect(() => {
        setTokenOneAmount(0);
        setTokenTwoAmount(0);
        const provider = new ethers.providers.JsonRpcProvider(`https://${network}.hashio.io/api`);
        console.log(network);
        setOracleContracts( network === 'mainnet' ? {
            SaucerSwap: new ethers.Contract(oracles().SaucerSwap, basicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles().Pangolin, basicOracleABI, provider),
            HeliSwap: new ethers.Contract(oracles().HeliSwap, basicOracleABI, provider),
        } : {
            SaucerSwap: new ethers.Contract(oracles().SaucerSwap, basicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles().Pangolin, basicOracleABI, provider),
        });
    }, [signer, tokensMap]);

    useEffect(() => {
        setTokenOne(tokens[0]);
        setTokenTwo(tokens[8]);
        fetchDexSwap(tokens[0]?.solidityAddress, tokens[8]?.solidityAddress)
    }, [oracleContracts]);

    useEffect(() => {
        messageApi.destroy()
        if (isLoading) {
            messageApi.open({
                content: 'Waiting for transaction to be mined',
                type: 'loading',
                duration: 0
            })
        }
    }, [isLoading])

    useEffect(() => {
        messageApi.destroy()
        if (isSuccess) {
            messageApi.open({
                type: 'success',
                content: 'Transaction Success',
                duration: 2
            })
        } else if (txDetails.to) {
            messageApi.open({
                type: 'error',
                content: 'Transaction Failed',
                duration: 2
            })
        }
    }, [isSuccess])

    useEffect(() => {
        if (txDetails.to && !!connectionData?.accountIds?.[0]) {
            sendTransaction()
            message.success('Transaction sent')
        }
    }, [txDetails])

    const settingsContent = (
        <>
            <div>Slippage Tolerance</div>
            <div>
                <Radio.Group onChange={handleSlippage} value={slippage}>
                    <Radio.Button value={1}>1%</Radio.Button>
                    <Radio.Button value={2}>2%</Radio.Button>
                    <Radio.Button value={2.5}>2.5%</Radio.Button>
                    <Radio.Button value={3.5}>3.5%</Radio.Button>
                    <Radio.Button value={5}>5%</Radio.Button>
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
                    {tokens?.map((token, index) => {
                        return (
                            <div className='tokenChoice' key={index}
                                 onClick={() => modifyToken(index)}
                            >
                                <img src={token.icon} alt={token.symbol} className="tokenLogo"/>
                                <div className='tokenChoiceNames'>
                                    <div className='tokenName'>
                                        {token.name}
                                    </div>
                                    <div className='tokenTicker'>
                                        {token.symbol}
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
                        <Input placeholder='0' value={tokenOneAmount} onChange={changeAmountOne}
                               disabled={isAtLeastOnePrice()}/>
                    </div>
                    <div className={feeOnTransfer ? '' : 'approx'}>
                        <Input placeholder='0' value={tokenTwoAmount} onChange={changeAmountTwo}
                               disabled={isAtLeastOnePrice()}/>
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
                        <span className='ratesLogoTop'>Best rate: {convertPrice(getSortedPrices()?.[0]?.price)}</span>
                        <button className='ratesLogoToggle'
                                onClick={() => switchAllRates()}>{checkAllRatesOpen ? 'Hide all rates' : 'Check all rates'}</button>
                    </div>
                    {checkAllRatesOpen
                        ? getSortedPrices().map(({ name, price }) => <div className='ratesLogo' key={name}>
                            <img className='ratesLogoIcon' title={name} src={oracleSettings()[name].icon}
                                 alt={name}/> {convertPrice(price)}
                        </div>)
                        : ''
                    }
                </div>
                <div>
                </div>
                <div className='swapButton' onClick={fetchDex} disabled={!tokenOneAmount || !connectionData?.accountIds?.[0]}>
                    Swap
                </div>
            </div>
        </>
    )
}

export default Swap
