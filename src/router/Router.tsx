import React, {Suspense, lazy} from 'react';
import Swap from "../pages/Swap/Swap";
import Tokens from "../pages/Tokens/Tokens";
import {Route, Routes} from "react-router-dom";
import {IToken, IWallet} from "../Models";
import { Token } from '../types/token';

export interface IAppRouterProps{
    wallet: IWallet;
    tokens: Map<string, Token>;
    network: string;
    hSuitePools: {};
    rate: number | null;
}

const AppRouter = ({wallet, tokens, hSuitePools, network, rate}: IAppRouterProps) => {

    return (
        <Routes>
            <Route path="/" element={
                <Swap
                    wallet={wallet}
                    tokens={tokens}
                    network={network}
                    hSuitePools={hSuitePools}
                    rate={rate}
                />
            }/>
            <Route path="/tokens" element={<Tokens tokens={tokens}/>}/>
        </Routes>
    );
};

export default AppRouter;
