import {StatsVolumeDto} from "./Components/TokensModal/types/StatsVolume.dto";
import {STATS_GROUP_BY} from "./Types/GroupBy";
import {DateTime} from 'luxon';
import {StatsVolumeDEXDto} from "./Components/TokensModal/types/StatsVolumeDEX.dto";
import {BigNumber} from "ethers";
import {STATS_CURRENCY} from "./Types/Currency";
import {StackColumn} from "./Types/StackColumn";
import {StatsVolumeSourceDto} from "./Components/TokensModal/types/StatsVolumeSource.dto";
import {StatsVolumeWalletDto} from "./Components/TokensModal/types/StatsVolumeWallet.dto";
import {AccountId, Wallet} from "@hashgraph/sdk";

const getDatesArray = (firstDate: DateTime, lastDate: DateTime, groupBy: STATS_GROUP_BY) => {
    let datesArray = [];

    let currentDate = firstDate;
    while (currentDate <= lastDate) {
        datesArray.push(currentDate);
        if (groupBy === STATS_GROUP_BY.DAY) {
            currentDate = currentDate.plus({ days: 1 });
        } else if (groupBy === STATS_GROUP_BY.WEEK) {
            currentDate = currentDate.plus({ weeks: 1 });
        } else if (groupBy === STATS_GROUP_BY.MONTH) {
            currentDate = currentDate.plus({ months: 1 });
        } else {
            throw new Error('Invalid shift type.');
        }
    }

    return datesArray;
};

export const fillEmptyDates = <T extends StatsVolumeDto | StatsVolumeDEXDto | StatsVolumeSourceDto>(data: T[], groupBy: STATS_GROUP_BY): T[] => {
    const { label, ...fieldsToPopulate } = data[0];
    Object.keys(fieldsToPopulate).forEach(field => (fieldsToPopulate as any)[field] = '0');
    const dataWithFilledGaps: T[] = [];
    const firstDate = groupBy === STATS_GROUP_BY.MONTH
        ? DateTime.fromFormat(data[0].label, 'yyyy-MM')
        : (groupBy === STATS_GROUP_BY.WEEK
            ? DateTime.fromFormat(data[0].label, 'kkkk-WW')
            : DateTime.fromFormat(data[0].label, 'yyyy-MM-dd'));
    const lastDate = groupBy === STATS_GROUP_BY.MONTH
        ? DateTime.fromFormat(data[data.length - 1].label, 'yyyy-MM')
        : (groupBy === STATS_GROUP_BY.WEEK
            ? DateTime.fromFormat(data[data.length - 1].label, 'kkkk-WW')
            : DateTime.fromFormat(data[data.length - 1].label, 'yyyy-MM-dd'));

    getDatesArray(firstDate, lastDate, groupBy).map(date => {
        const dateString = groupBy === STATS_GROUP_BY.MONTH
            ? date.toFormat('yyyy-MM')
            : (groupBy === STATS_GROUP_BY.WEEK
                ? date.toFormat('kkkk-WW')
                : date.toFormat('yyyy-MM-dd'));

        const existingData = data.find(item => item.label === dateString);
        if (existingData) {
            dataWithFilledGaps.push(existingData);
        } else {
            dataWithFilledGaps.push({
                label: dateString,
                ...fieldsToPopulate,
            } as T);
        }
    });

    return dataWithFilledGaps;
}

export const prepareData = <T extends StatsVolumeDto | StatsVolumeDEXDto | StatsVolumeSourceDto | StatsVolumeWalletDto>(data: T[]) => data.map(({ label, ...rest }) => ({
    label,
    ...Object.keys(rest).reduce((acc, prop) => ({
        ...acc,
        // @ts-ignore
        [prop]: BigNumber.from(rest[prop]).div(prop.includes(STATS_CURRENCY.USD) ? 100 : (prop.includes(STATS_CURRENCY.HBAR) ? 100000000 : 1)).toNumber()
    }), {})
}));

export const transformDataToStackedColumn = <T extends StatsVolumeDEXDto>(data: T[], currency: STATS_CURRENCY): StackColumn[] => {
    return data.flatMap(item => {
        const { label, ...rest } = item;
        return Object.keys(rest).map(key => ({
            label: label,
            type: key,
            // @ts-ignore
            value: rest[key] as number
        }));
    }).filter(item => item.type.includes(currency));
};

export const prepareWalletRelatedData = <T extends StatsVolumeWalletDto>(data: T[]) => data.map(({ label, ...rest }) => ({
    label,
    ...Object.keys(rest).reduce((acc, prop) => ({
        ...acc,
        // @ts-ignore
        [prop]: BigNumber.from(rest[prop]).div(prop.includes(STATS_CURRENCY.USD) ? 100 : (prop.includes(STATS_CURRENCY.HBAR) ? 100000000 : 0)).toNumber()
    }), {})
}));

export const transformDataToBar = <T extends StatsVolumeWalletDto>(data: T[], fieldName: string): StatsVolumeWalletDto[] => {
    const top30 = data.slice(0, 30).map(({label, ...rest}) => ({ label: AccountId.fromSolidityAddress(label).toString(), ...rest }));
    // @ts-ignore
    const otherAmount = data.slice(30).reduce((sum, item) => BigNumber.from(sum).add(item[fieldName]), BigNumber.from(0));
    // @ts-ignore
    top30.push({ label: 'Others', [fieldName]: otherAmount.toString()});

    return top30;
};
