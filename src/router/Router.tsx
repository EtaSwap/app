import React from 'react';
import Swap from "../pages/Swap/Swap";
import Tokens from "../pages/Tokens/Tokens";
import {Route, Routes} from "react-router-dom";
import {IWallet} from "../models";
import { Token } from '../types/token';
import { Provider } from '../class/providers/provider';
import Stats from "../pages/Stats/Stats";

export interface IAppRouterProps{
    wallet: IWallet;
    tokens: Map<string, Token>;
    rate: number | null;
    providers: Record<string, Provider>;
    setWalletModalOpen: any;
}

const AppRouter = ({wallet, tokens, rate, providers, setWalletModalOpen}: IAppRouterProps) => {

    return (
        <Routes>
            <Route path="/" element={
                <Swap
                    wallet={wallet}
                    tokens={tokens}
                    rate={rate}
                    providers={providers}
                    setWalletModalOpen={setWalletModalOpen}
                />
            }/>
            <Route path="/tokens" element={<Tokens tokens={tokens}/>}/>
            <Route path="/stats/*" element={<Stats/>}/>
        </Routes>
    );
};

export default AppRouter;
