import { Input, Popover, Radio, Modal, message } from 'antd'
import { ArrowDownOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useSendTransaction, useWaitForTransaction } from "wagmi"
import { ethers } from 'ethers';
import PangolinLogo from '../pangolin.png';
import SaucerSwapLogo from '../saucerswap.ico';
import { ContractExecuteTransaction, ContractFunctionParameters, TransactionReceipt, AccountAllowanceApproveTransaction } from '@hashgraph/sdk';

const oracleSettings = {
    saucerSwap: { icon: SaucerSwapLogo },
    pangolin: { icon: PangolinLogo },
};

const oracles = {
    saucerSwap: '0x5AFa43e1595e88401455A06aEd98F11D7b8d9FEF',
    pangolin: '0x8900644acC7EEf318678404cfadD1A96FE660e77',
};

const exchange = '0.0.487035';
const uniswapAdapter = '0x0000000000000000000000000000000000076e7e';

//
// const oracles = {
//     saucerSwap: '0.0.476173',
//     pangolin: '0.0.476174',
// };

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
            },
            {
                "internalType": "contract IERC20",
                "name": "connector",
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
            },
            {
                "internalType": "address",
                "name": "pool",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true,
    }
];

const erc20ABI = [{
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
        {
            "name": "",
            "type": "uint8"
        }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
}];

function Swap(props) {
    const { address, isConnected, tokens: tokensMap, connect, connectionData, signer } = props;
    const tokens = [...tokensMap].map(wrap => wrap[1]);
    const [oracleContracts, setOracleContracts] = useState({
        saucerSwap: null,
        pangolin: null,
    });
    const [slippage, setSlippage] = useState(2.5);
    const [feeOnTransfer, setFeeOnTransfer] = useState(false);
    const [messageApi, contextHolder] = message.useMessage()
    const [tokenOneAmount, setTokenOneAmount] = useState(0)
    const [tokenTwoAmount, setTokenTwoAmount] = useState(0)
    const [tokenOne, setTokenOne] = useState(tokens[0])
    const [tokenTwo, setTokenTwo] = useState(tokens[1])
    const [isOpen, setIsOpen] = useState(false)
    const [checkAllRatesOpen, setCheckAllRatesOpen] = useState(false);
    const [changeToken, setChangeToken] = useState(1)
    const [prices, setPrices] = useState({
        saucerSwap: null,
        pangolin: null,
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
            saucerSwap: null,
            pangolin: null,
        })
        setTokenOneAmount(0)
        setTokenTwoAmount(0)
        setTokenOne(tokenTwo)
        setTokenTwo(tokenOne)
        fetchDexSwap(tokenTwo.solidityAddress, tokenOne.solidityAddress)
    }

    const openModal = (token) => {
        setChangeToken(token)
        setIsOpen(true)
    }

    const modifyToken = (i) => {
        setPrices({
            saucerSwap: null,
            pangolin: null,
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

    const fetchDexSwap = async (one, two) => {
        const res = await Promise.allSettled(Object.keys(oracleContracts).map(async i => {
            return oracleContracts[i].getRate(one, two, '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
        }));

        setPrices({
            saucerSwap: res[0].status === 'fulfilled' ? res[0].value.rate : null,
            pangolin: res[1].status === 'fulfilled' ? res[1].value.rate : null,
        });
    }

    const getSortedPrices = () => {
        return Object.keys(prices)
            .filter(name => prices[name])
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

    const fetchDex = async () => {
        const deadline = Math.floor(Date.now() / 1000) + 1000;

        const allowanceTx = await new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(
                tokenOne.address,
                connectionData?.accountIds?.[0],
                exchange,
                feeOnTransfer
                    ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul((100+slippage)*10).div(1000).toString()
                    : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString(),
            )
            .freezeWithSigner(signer);
        await allowanceTx.executeWithSigner(signer);

        let swapTransaction = await new ContractExecuteTransaction()
            .setContractId(exchange)
            .setGas(5000000)
            .setFunction("swap", new ContractFunctionParameters()
                .addString("SaucerSwapV2")
                .addAddress(tokenOne.solidityAddress)
                .addAddress(tokenTwo.solidityAddress)
                .addUint256(
                    feeOnTransfer
                        ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul((100+slippage)*10).div(1000).toString()
                        : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString()
                )
                .addUint256(
                    feeOnTransfer
                        ? ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).toString()
                        : ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul((100-slippage)*10).div(1000).toString()
                )
                .addUint256(deadline)
                .addBool(feeOnTransfer)
                .addUint256(ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).div(100).toString())
            )
            .freezeWithSigner(signer);

        await swapTransaction.executeWithSigner(signer);
    }

    useEffect(() => {
        fetchDexSwap(tokens[0]?.solidityAddress, tokens[1]?.solidityAddress)
    }, [signer])

    useEffect(() => {
            const provider = new ethers.providers.JsonRpcProvider('https://testnet.hashio.io/api');
            setOracleContracts({
                saucerSwap: new ethers.Contract(oracles.saucerSwap, basicOracleABI, provider),
                pangolin: new ethers.Contract(oracles.pangolin, basicOracleABI, provider),
            });
            setTokenOne(tokens[0]);
            setTokenTwo(tokens[1]);
    }, [signer]);

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
        if (txDetails.to && isConnected) {
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
                    <Radio.Button value={2.5}>2.5%</Radio.Button>
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
                                <img src={token.icon} alt={token.ticker} className="tokenLogo"/>
                                <div className='tokenChoiceNames'>
                                    <div className='tokenName'>
                                        {token.name}
                                    </div>
                                    <div className='tokenTicker'>
                                        {token.ticker}
                                    </div>
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
                    <div className={ feeOnTransfer ? 'approx' : '' }>
                        <Input placeholder='0' value={tokenOneAmount} onChange={changeAmountOne} disabled={isAtLeastOnePrice()} />
                    </div>
                    <div className={ feeOnTransfer ? '' : 'approx' }>
                        <Input placeholder='0' value={tokenTwoAmount} onChange={changeAmountTwo} disabled={isAtLeastOnePrice()} />
                    </div>
                    <div className="switchButton" onClick={switchTokens}>
                        <ArrowDownOutlined className='switchArrow'/>
                    </div>
                    <div className='assetOne' onClick={() => openModal(1)}>
                        <img src={tokenOne?.icon} alt="assetOnelogo" className='logo'/>
                        {tokenOne?.ticker}
                    </div>
                    <div className='assetTwo' onClick={() => openModal(2)}>
                        <img src={tokenTwo?.icon} alt="assetTwologo" className='logo'/>
                        {tokenTwo?.ticker}
                    </div>
                </div>
                <div className='ratesLogoWrapper'>
                    <div className='ratesLogoInner'>
                        <span className='ratesLogoTop'>Best rate: {convertPrice(getSortedPrices()?.[0]?.price)}</span>
                        <button className='ratesLogoToggle' onClick={() => switchAllRates()}>{checkAllRatesOpen ? 'Hide all rates' : 'Check all rates'}</button>
                    </div>
                    { checkAllRatesOpen
                        ? getSortedPrices().map(({ name, price }) => <div className='ratesLogo' key={name}>
                            <img className='ratesLogoIcon' title={name} src={oracleSettings[name].icon} alt={name}/> {convertPrice(price)}
                        </div>)
                        : ''
                    }
                </div>
                <div>
                </div>
                <div className='swapButton' onClick={fetchDex} disabled={!tokenOneAmount || !isConnected}>
                    Swap
                </div>
            </div>
        </>
    )
}

export default Swap


// 3 00000000 HBAR
// 9 000000 SAUCE
//
// SAUCE/HBAR = 0.03   -> +00 null diff
// HBAR/SAUCE = 33.33  -> -00 null diff
//
//