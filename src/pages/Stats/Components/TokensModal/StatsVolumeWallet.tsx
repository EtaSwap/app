import {useEffect, useState} from "react";
import {Select} from "antd";
import axios from "axios";
import {Bar} from "@ant-design/charts";
import {prepareData, transformDataToBar} from "../../stats.utils";
import {STATS_CURRENCY} from "../../Types/Currency";
import {StatsVolumeWalletDto} from "./types/StatsVolumeWallet.dto";
import {BigNumber} from "ethers";

export function StatsVolumeWallet({}: {
}) {
    const [currency, setCurrency] = useState<STATS_CURRENCY>(STATS_CURRENCY.USD);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        axios.get<StatsVolumeWalletDto[]>('https://api.etaswap.com/v1/statistics/volume/wallet').then(data => {
            setData(data.data.sort((a, b) => BigNumber.from(b[`amount${currency}`]).sub(a[`amount${currency}`]).gt(0) ? 1 : -1));
        });
    }, [currency]);

    return <div>
        <div className="stats__header">
            <h2 className='stats__title'>EtaSwap volume by wallet</h2>
            <Select
                value={currency}
                onChange={(value) => setCurrency(value)}
                options={Object.keys(STATS_CURRENCY).map(option => ({ value: option, label: option }))}
            />
        </div>
        <Bar
            data={prepareData(transformDataToBar(data, `amount${currency}`))}
            xField='label'
            yField={`amount${currency}`}
            theme='classicDark'
            height={650}
        />
    </div>;
}
