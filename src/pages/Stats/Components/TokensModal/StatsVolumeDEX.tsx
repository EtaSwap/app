import {useEffect, useState} from "react";
import {STATS_GROUP_BY} from "../../Types/GroupBy";
import {Select} from "antd";
import axios from "axios";
import {Column} from "@ant-design/charts";
import {fillEmptyDates, prepareData, transformDataToStackedColumn} from "../../stats.utils";
import {STATS_CURRENCY} from "../../Types/Currency";
import {StatsVolumeDEXDto} from "./types/StatsVolumeDEX.dto";

export function StatsVolumeDEX({}: {
}) {
    const [groupBy, setGroupBy] = useState<STATS_GROUP_BY>(STATS_GROUP_BY.DAY);
    const [currency, setCurrency] = useState<STATS_CURRENCY>(STATS_CURRENCY.USD);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        axios.get<StatsVolumeDEXDto[]>(`https://api.etaswap.com/v1/statistics/volume/dex?groupBy=${groupBy}`).then(data => {
            setData(prepareData(fillEmptyDates(data.data, groupBy)));
        });
    }, [groupBy]);

    return <div>
        <div className="stats__header">
            <h2 className='stats__title'>EtaSwap volume by DEX</h2>
            <Select
                style={{width: 120}}
                value={groupBy}
                onChange={(value) => setGroupBy(value)}
                options={Object.keys(STATS_GROUP_BY).map(option => ({ value: option, label: option }))}
            />
            <Select
                style={{width: 80}}
                value={currency}
                onChange={(value) => setCurrency(value)}
                options={Object.keys(STATS_CURRENCY).map(option => ({ value: option, label: option }))}
            />
        </div>
        <Column
            data={transformDataToStackedColumn(data, currency)}
            stack={true}
            colorField='type'
            xField='label'
            yField='value'
            theme={{
                type: 'classicDark',
                category10: ['#33BA2B','#5ad8a6','#FFC800','#2f18e5','#890bf8']
            }}
        />
    </div>;
}
