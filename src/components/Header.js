import React, { useState } from 'react'
import HederaLogo from '../assets/img/hedera-logo.png'
import Logo from '../logo.svg'
import {Link} from 'react-router-dom'
import Disconnect from '../assets/img/disconnect.png'
import { Modal } from 'antd';
import { NETWORKS } from '../utils/constants';

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
      <Modal open={networkModalOpen} footer={null} onCancel={() => {
        setNetworkModalOpen(false)
      }} title="Select network">
        <div className='modalContent'>
          {Object.values(NETWORKS).map((network, i) => {
            return (
              <div className='networkChoice' key={i} onClick={() => selectNetwork(network)}>
                <img src={HederaLogo} alt={'Hedera ' + network} className="networkLogoModal"/>
                <div className='networkName'>{'Hedera ' + network}</div>
              </div>
            )
          })}
        </div>
      </Modal>
      <Modal open={walletModalOpen} footer={null} onCancel={() => {
        setWalletModalOpen(false)
      }} title="Select wallet">
        <div className='modalContent'>
          {Object.values(wallets).map(({ name, title, image }, i) => {
            return (
              <button className='walletChoice' key={i} onClick={() => connectWallet(name)}>
                <img src={image} alt={title} title={title} className="walletLogo"/>
              </button>
            )
          })}
        </div>
      </Modal>
    </header>
  )
}

export default Header
