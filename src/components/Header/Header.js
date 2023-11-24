import React, { useState } from 'react'
import HederaLogo from '../../assets/img/hedera-logo.png'
import Logo from '../../logo.svg'
import {Link} from 'react-router-dom'
import Disconnect from '../../assets/img/disconnect.png'
import { Modal } from 'antd';
import { NETWORKS } from '../../utils/constants';
import './Header.css'
import {ConnectWalletModal} from "./components/ConnectWalletModal";
import {SelectNetworkModal} from "./components/SelectNetworkModal";

function Header({ wallet, wallets, network, setNetwork }) {
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const disconnectWallet = (name) => {
      wallets[name].instance.disconnect();
  }

  const connectWallet = (name) => {
    if (wallet.address) {
        if (wallet.name === name) {
            return null;
        }
        wallets[wallet.name].instance.disconnect();
    }
    wallets[name].instance.connect(network);
    setWalletModalOpen(false);
  }

  const selectNetwork = (name) => {
      if (network !== name) {
          setNetwork(name);
          if (wallet.name) {
              wallets[wallet.name].instance.disconnect();
          }
      }
      setNetworkModalOpen(false);
  }

  return (
    <header className='header'>
      <nav className='leftH'>
        <Link to='/'>
          <img src={Logo} alt='η' className='logo' title='EtaSwap' />
        </Link>
        <Link to='/' className='link'>Swap</Link>
        <Link to='/tokens' className='link'>Tokens</Link>
        <a href='https://docs.etaswap.com/' target='_blank' className='link'>Docs</a>
      </nav>
      <div className='rightH'>
        <div className='headerItem' onClick={() => setNetworkModalOpen(true)}>
          <img src={HederaLogo} alt={network} className='networkLogo' />
          Hedera {network}
        </div>
        {!!wallet?.address
          ? <>
            <img src={wallets[wallet.name].icon} className='walletIcon' alt={wallets[wallet.name].title} />
            {wallet?.address}
            <div className='connectButton' onClick={() => disconnectWallet(wallet.name)}>
              <img className='disconnectIcon' src={Disconnect} alt='disconnect'/>
            </div>
          </>
          : <div className='connectButton' onClick={() => setWalletModalOpen(true)}>Connect Wallet</div>
        }
      </div>
      <SelectNetworkModal networkModalOpen={networkModalOpen} selectNetwork={selectNetwork} setNetworkModalOpen={setNetworkModalOpen}/>
      <ConnectWalletModal connectWallet={connectWallet} walletModalOpen={walletModalOpen} wallets={wallets} setWalletModalOpen={setWalletModalOpen} />
    </header>
  )
}

export default Header
