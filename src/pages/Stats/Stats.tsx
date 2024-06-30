import React from 'react'
import './Stats.css'
import {NavLink, Navigate, Route, Routes} from "react-router-dom";
import {StatsVolume} from "./Components/TokensModal/StatsVolume";
import {StatsVolumeDEX} from "./Components/TokensModal/StatsVolumeDEX";
import {StatsVolumeSource} from "./Components/TokensModal/StatsVolumeSource";
import {StatsVolumeWallet} from "./Components/TokensModal/StatsVolumeWallet";
import {StatsSwapsWallet} from "./Components/TokensModal/StatsSwapsWallet";

function Stats() {
    const statsClass = (isActive: boolean ) => isActive ? 'stats__menu-link stats__menu-link--active' : 'stats__menu-link';
    return (
        <div className='stats'>
            <div className="container">
                <div className="stats__wrapper">
                    <menu className="stats__menu">
                        <li className="stats__menu-item">
                            <NavLink
                                className={({ isActive }) => statsClass(isActive)}
                                to='/stats/volume/total'
                            >Volume</NavLink>
                        </li>
                        <li className="stats__menu-item">
                            <NavLink
                                className={({ isActive }) => statsClass(isActive)}
                                to='/stats/volume/dex'
                            >Volume by DEX</NavLink>
                        </li>
                        <li className="stats__menu-item">
                            <NavLink
                                className={({ isActive }) => statsClass(isActive)}
                                to='/stats/volume/source'
                            >Volume by source</NavLink>
                        </li>
                        <li className="stats__menu-item">
                            <NavLink
                                className={({ isActive }) => statsClass(isActive)}
                                to='/stats/volume/wallet'
                            >Volume by wallet</NavLink>
                        </li>
                        <li className="stats__menu-item">
                            <NavLink
                                className={({ isActive }) => statsClass(isActive)}
                                to='/stats/swaps/wallet'
                            >Swaps by wallet</NavLink>
                        </li>
                    </menu>
                    <div className="stats__chart">
                        <Routes>
                            <Route path="/volume/total" element={<StatsVolume/>}/>
                            <Route path="/volume/dex" element={<StatsVolumeDEX/>}/>
                            <Route path="/volume/source" element={<StatsVolumeSource/>}/>
                            <Route path="/volume/wallet" element={<StatsVolumeWallet/>}/>
                            <Route path="/swaps/wallet" element={<StatsSwapsWallet/>}/>
                            <Route
                                path="*"
                                element={<Navigate to="/stats/volume/total" replace />}
                            />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Stats
