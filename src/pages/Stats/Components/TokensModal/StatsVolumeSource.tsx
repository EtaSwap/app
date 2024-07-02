import {useEffect, useState} from "react";
import {STATS_GROUP_BY} from "../../Types/GroupBy";
import {Select} from "antd";
import axios from "axios";
import {Column} from "@ant-design/charts";
import {fillEmptyDates, prepareData, transformDataToStackedColumn} from "../../stats.utils";
import {STATS_CURRENCY} from "../../Types/Currency";
import {StatsVolumeSourceDto} from "./types/StatsVolumeSource.dto";

export function StatsVolumeSource({}: {
}) {
    const [groupBy, setGroupBy] = useState<STATS_GROUP_BY>(STATS_GROUP_BY.DAY);
    const [currency, setCurrency] = useState<STATS_CURRENCY>(STATS_CURRENCY.USD);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        axios.get<StatsVolumeSourceDto[]>(`https://api.etaswap.com/v1/statistics/volume/source?groupBy=${groupBy}`).then(data => {
            setData(prepareData(fillEmptyDates(data.data, groupBy)));
        });
    }, [groupBy]);

    return <div>
        <div className="stats__header">
            <h2 className='stats__title'>EtaSwap volume by source</h2>
            <Select
                value={groupBy}
                onChange={(value) => setGroupBy(value)}
                options={Object.keys(STATS_GROUP_BY).map(option => ({ value: option, label: option }))}
            />
            <Select
                value={currency}
                onChange={(value) => setCurrency(value)}
                options={Object.keys(STATS_CURRENCY).map(option => ({ value: option, label: option }))}
            />
        </div>
        <Column
            data={transformDataToStackedColumn(data, currency)}
            colorField='type'
            xField='label'
            yField='value'
            theme='classicDark'
        />
    </div>;
}
