import React from 'react';
import {Link} from 'react-router-dom';
import {IWallet, IWallets} from "../../models";

function Header({wallet, wallets, disconnectWallet, setWalletModalOpen}: {
    wallet: IWallet;
    wallets: IWallets;
    disconnectWallet: any;
    setWalletModalOpen: any;
}) {
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
                            <a className='appheader__menu-link' href='https://docs.etaswap.com' target='_blank'>Docs</a>
                        </li>
                        <li className="appheader__menu-item">
                            <Link className={'appheader__menu-link'} to='/stats'>Stats</Link>
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
                </div>
            </div>
        </header>
    )
}

export default Header
