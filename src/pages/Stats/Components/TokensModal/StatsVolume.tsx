import {useEffect, useState} from "react";
import {STATS_GROUP_BY} from "../../Types/GroupBy";
import {Select} from "antd";
import axios from "axios";
import {Column} from "@ant-design/charts";
import {StatsVolumeDto} from "./types/StatsVolume.dto";
import {fillEmptyDates, prepareData} from "../../stats.utils";
import {STATS_CURRENCY} from "../../Types/Currency";

export function StatsVolume({}: {
}) {
    const [groupBy, setGroupBy] = useState<STATS_GROUP_BY>(STATS_GROUP_BY.DAY);
    const [currency, setCurrency] = useState<STATS_CURRENCY>(STATS_CURRENCY.USD);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        axios.get<StatsVolumeDto[]>(`https://api.etaswap.com/v1/statistics/volume?groupBy=${groupBy}`).then(data => {
            setData(prepareData(fillEmptyDates(data.data, groupBy)));
        });
    }, [groupBy]);

    return <div>
        <div className="stats__header">
            <h2 className='stats__title'>EtaSwap volume</h2>
            <Select
                style={{width: 120}}
                value={groupBy}
                onChange={(value) => setGroupBy(value)}
                options={Object.keys(STATS_GROUP_BY).map(option => ({value: option, label: option}))}
            />
            <Select
                style={{width: 80}}
                value={currency}
                onChange={(value) => setCurrency(value)}
                options={Object.keys(STATS_CURRENCY).map(option => ({value: option, label: option}))}
            />
        </div>
        <Column
            data={data}
            xField='label'
            yField={`volume${currency}`}
            theme='classicDark'
        />
    </div>;
}
