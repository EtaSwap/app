import { Input, Popover, Radio, Modal, message } from 'antd'
import { ArrowDownOutlined, SettingOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { BigNumber, ethers } from 'ethers';
import PangolinLogo from '../img/pangolin.png';
import SaucerSwapLogo from '../img/saucerswap.ico';
import HeliSwapLogo from '../img/heliswap.png';
import {
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountAllowanceApproveTransaction
} from '@hashgraph/sdk';

const GAS_LIMITS = {
    exactTokenToToken: 900000, //877969    875079
    exactHBARToToken: 260000, //221207     203366
    exactTokenToHBAR: 1670000, //1629306   1623679
    tokenToExactToken: 920000, //894071    891182
    HBARToExactToken: 260000, //211040     218135
    tokenToExactHBAR: 1690000, //1645353   1639941
};

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
    const [checkAllRatesOpen, setCheckAllRatesOpen] = useState(false);
    const [changeToken, setChangeToken] = useState(1)
    const refreshCount = useRef(0);
    const refreshTimer = useRef(0);
    const [isRefreshAnimationActive, setIsRefreshAnimationActive] = useState(false);
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

    const oracleSettings = () => network === 'mainnet' ? {
        SaucerSwap: { icon: SaucerSwapLogo, aggregatorId: 'SaucerSwap', feePromille: 3, whbar: '0x0000000000000000000000000000000000163b5a' },
        Pangolin: { icon: PangolinLogo, aggregatorId: 'Pangolin', feePromille: 3, whbar: '0x00000000000000000000000000000000001a8837' },
        HeliSwap: { icon: HeliSwapLogo, aggregatorId: 'HeliSwap', feePromille: 5, whbar: '0x00000000000000000000000000000000002cc823' },
    } : {
        SaucerSwap: { icon: SaucerSwapLogo, aggregatorId: 'SaucerSwap', feePromille: 3, whbar: '0x000000000000000000000000000000000000e6a2' },
        Pangolin: { icon: PangolinLogo, aggregatorId: 'Pangolin', feePromille: 3, whbar: '0x000000000000000000000000000000000002690a' },
    };

    const oracles = () => network === 'mainnet' ? {
        SaucerSwap: '0xc47037963fad3a5397cca3fef5c1c95839dc6363',
        Pangolin: '0xfa7206b4c9d46af2e2f7f3b1bd4d3aa2aeca6e71',
        HeliSwap: '0x51851a39da39c53f9b564cfdf7e6f55dc8850225',
    } : {
        SaucerSwap: '0x4afa14cbA5043BE757c028b0D0B5148df12ce9e4',
        Pangolin: '0x9dAdB3285AC2d65A2cbB1341Aa0c14edc8c2F2b9',
    };

    const exchange = () => network === 'mainnet' ? '0.0.3745835' : '0.0.1173826';

    const handleSlippage = (e) => {
        setSlippage(e.target.value)
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
        if (input.match(/^([0-9]{1,})?(\.)?([0-9]{1,})?$/)) {
            setTokenOneAmount(input || 0);
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
        if (input.match(/^([0-9]{1,})?(\.)?([0-9]{1,})?$/)) {
            setTokenTwoAmount(input || 0);
        }
    }

    const switchTokens = () => {
        setPrices({
            SaucerSwap: null,
            Pangolin: null,
            HeliSwap: null,
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
            SaucerSwap: res[0].status === 'fulfilled' ? res[0].value : null,
            Pangolin: res[1].status === 'fulfilled' ? res[1].value : null,
            HeliSwap: res[2]?.status === 'fulfilled' ? res[2].value : null,
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
            if (!price || !tokenOne?.decimals || !tokenTwo?.decimals) {
                continue;
            }

            const priceRes = { price, weight, name };

            const volume = weight.pow(2);
            const Va = sqrt(volume.mul(BigNumber.from(10).pow(18)).div(price));
            const Vb = volume.div(Va);

            if (feeOnTransfer) {
                const amountOut = BigNumber.from(ethers.utils.parseUnits(tokenTwoAmount.toString(), tokenTwo.decimals));
                const VaAfter = amountOut.mul(Va).div(Vb.sub(amountOut)).mul(1000).div(1000 + oracleSettings()[name].feePromille);
                const priceImpact = amountOut.mul(10000).div(Vb);
                priceRes.amountOut = VaAfter;
                priceRes.priceImpact = priceImpact;
                if (VaAfter.gt(0)) {
                    pricesRes.push(priceRes);
                }
            } else {
                const amountIn = BigNumber.from(ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals));
                const VbAfter = amountIn.mul(Vb).div(Va.add(amountIn)).mul(1000).div(1000 - oracleSettings()[name].feePromille);
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
        return !Object.values(prices).find(price => !price?.rate?.isZero());
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
                    exchange(),
                    feeOnTransfer
                        ? ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10 + oracleSettings()[bestRate.name].feePromille).div(1000).toString()
                        : ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).toString(),
                )
                .freezeWithSigner(signer);
            await allowanceTx.executeWithSigner(signer);
        }

        let swapTransaction = await new ContractExecuteTransaction()
            .setContractId(exchange())
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
        setOracleContracts( network === 'mainnet' ? {
            SaucerSwap: new ethers.Contract(oracles().SaucerSwap, basicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles().Pangolin, basicOracleABI, provider),
            HeliSwap: new ethers.Contract(oracles().HeliSwap, basicOracleABI, provider),
        } : {
            SaucerSwap: new ethers.Contract(oracles().SaucerSwap, basicOracleABI, provider),
            Pangolin: new ethers.Contract(oracles().Pangolin, basicOracleABI, provider),
        });
    }, [signer, tokensMap]);

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
            || !connectionData?.accountIds?.[0]
            || !bestPrice?.price
            || bestPrice?.priceImpact?.gt(2000);
    }

    useEffect(() => {
        setTokenOne(tokens[2]);
        setTokenTwo(tokens[3]);
        fetchDexSwap(tokens[2]?.solidityAddress, tokens[3]?.solidityAddress)
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
                    ? <div>Max to sell: { ethers.utils.formatUnits(ethers.utils.parseUnits(tokenOneAmount, tokenOne.decimals).mul(1000 + slippage * 10 + oracleSettings()[getBestPriceName()].feePromille).div(1000).toString(), tokenOne.decimals) }</div>
                    : <div>Min receive: { ethers.utils.formatUnits(ethers.utils.parseUnits(tokenTwoAmount, tokenTwo.decimals).mul(1000 - slippage * 10 - oracleSettings()[getBestPriceName()].feePromille).div(1000).toString(), tokenTwo.decimals) }</div>
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
