import {useEffect, useState} from "react";
import {Select} from "antd";
import axios from "axios";
import {Bar} from "@ant-design/charts";
import {prepareData, transformDataToBar} from "../../stats.utils";
import {STATS_CURRENCY} from "../../Types/Currency";
import {StatsVolumeWalletDto} from "./types/StatsVolumeWallet.dto";
import {BigNumber} from "ethers";
import {StatsSwapsWalletDto} from "./types/StatsSwapsWallet.dto";

export function StatsSwapsWallet({}: {
}) {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        axios.get<StatsSwapsWalletDto[]>('https://api.etaswap.com/v1/statistics/swaps/wallet').then(data => {
            setData(data.data.sort((a, b) => b.count - a.count));
        });
    }, []);

    return <div>
        <div className="stats__header">
            <h2 className='stats__title'>EtaSwap swaps by wallet</h2>
        </div>
        <Bar
            data={prepareData(transformDataToBar(data, 'count'))}
            xField='label'
            yField='count'
            theme='classicDark'
            height={650}
        />
    </div>;
}
