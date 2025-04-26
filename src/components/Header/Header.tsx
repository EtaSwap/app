import React, { useState } from 'react';
import {Link} from 'react-router-dom';
import {IWallet, IWallets} from "../../models";
import { Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import TollIcon from '@mui/icons-material/Toll';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BarChartIcon from '@mui/icons-material/BarChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Social from '../Social/Social';

function Header({wallet, wallets, disconnectWallet, setWalletModalOpen}: {
    wallet: IWallet;
    wallets: IWallets;
    disconnectWallet: any;
    setWalletModalOpen: any;
}) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <header className="appheader">
            <div className="container">
                <div className="appheader__wrapper">
                    <div className="appheader__logo">
                        <img src="/logo-color.svg" alt="EtaSwap" className="logo"/>
                    </div>
                    <menu className="appheader__menu">
                        <li className="appheader__menu-item">
                            <Link className={'appheader__menu-link'} to='/'>Home</Link>
                        </li>
                        <li className="appheader__menu-item">
                            <Link className={'appheader__menu-link'} to='/tokens'>Tokens</Link>
                        </li>
                        <li className="appheader__menu-item">
                            <a className='appheader__menu-link' href='https://docs.etaswap.com' target='_blank'
                               rel="noreferrer">Docs</a>
                        </li>
                        <li className="appheader__menu-item">
                            <Link className={'appheader__menu-link'} to='/stats'>Stats</Link>
                        </li>
                        <li className="appheader__menu-item">
                            <a className='appheader__menu-link' href='https://app.etabridge.com' target='_blank'
                               rel="noreferrer">Bridge</a>
                        </li>
                    </menu>
                    <div className="appheader__button">
                        {!!wallet?.address
                            ? <>
                                <img src={wallets[wallet.name].icon} className='appheader__client'
                                     alt={wallets[wallet.name].title}/>
                                <span className="appheader__address">{wallet?.address}</span>
                                <button
                                    className="button button&#45;&#45;small"
                                    title="Logout"
                                    onClick={() => disconnectWallet(wallet.name)}
                                >
                                    <svg className="appheader__logout">
                                        <use href="#icon&#45;&#45;logout" xlinkHref="#icon&#45;&#45;logout"></use>
                                    </svg>
                                </button>
                            </>
                            : <button className="button button--small" onClick={() => setWalletModalOpen(true)}>
                                Connect wallet
                            </button>
                        }
                    </div>
                    <IconButton className="burger__button" onClick={() => setDrawerOpen(true)}>
                        <MenuIcon className="burger__icon" fontSize="large"/>
                    </IconButton>
                    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                        <div className="burger__logo">
                            <img src="/logo-color.svg" alt="EtaSwap" className="burger__logo-icon"/>
                            <span className='burger__logo-name'>EtaSwap</span>
                        </div>
                        <hr className="burger__divider"/>
                        <menu className="burger__menu">
                            <li className="burger__menu-item">
                                <Link onClick={() => setDrawerOpen(false)} className={'burger__menu-link'} to='/'>
                                    <HomeIcon className='burger__menu-icon'/>
                                    <span className='burger__menu-title'>Home</span>
                                </Link>
                            </li>
                            <li className="burger__menu-item">
                                <Link onClick={() => setDrawerOpen(false)} className={'burger__menu-link'} to='/tokens'>
                                    <TollIcon className='burger__menu-icon'/>
                                    <span className='burger__menu-title'>Tokens</span>
                                </Link>
                            </li>
                            <li className="burger__menu-item">
                                <a onClick={() => setDrawerOpen(false)} className='burger__menu-link'
                                   href='https://docs.etaswap.com' target='_blank'
                                   rel="noreferrer">
                                    <MenuBookIcon className='burger__menu-icon'/>
                                    <span className='burger__menu-title'>Docs</span>
                                </a>
                            </li>
                            <li className="burger__menu-item">
                                <Link onClick={() => setDrawerOpen(false)} className={'burger__menu-link'} to='/stats'>
                                    <BarChartIcon className='burger__menu-icon'/>
                                    <span className='burger__menu-title'>Stats</span>
                                </Link>
                            </li>
                            <li className="burger__menu-item">
                                <a onClick={() => setDrawerOpen(false)} className='burger__menu-link'
                                   href='https://app.etabridge.com' target='_blank'
                                   rel="noreferrer">
                                    <SwapHorizIcon className='burger__menu-icon'/>
                                    <span className='burger__menu-title'>Bridge</span>
                                </a>
                            </li>
                        </menu>
                        <hr className="burger__divider"/>
                        <Social/>
                    </Drawer>
                </div>
            </div>
        </header>
    )
}

export default Header
