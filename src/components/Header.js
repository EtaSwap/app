import React, { useState } from 'react'
import HederaLogo from '../img/hedera-logo.png'
import Logo from '../logo.svg'
import {Link} from 'react-router-dom'
import Disconnect from '../img/disconnect.png'
import { Modal } from 'antd';

function Header({ wallet, setWallet, wallets, connect, connectionData, setConnectionData, network, setNetwork }) {
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const networks = [
      { name: 'testnet', title: 'Hedera testnet' },
      { name: 'mainnet', title: 'Hedera mainnet' },
  ];

  const disconnectWallet = (name) => {
      wallets[name].instance.disconnect();
  }

  const connectWallet = (name) => {
    if (wallet.name) {
        if (wallet.name === name) {
            return null;
        }
        wallets[wallet.name].instance.disconnect();
    }
    setWallet(name);
    wallets[name].instance.connect(network);
    setWalletModalOpen(false);
  }

  const selectNetwork = (name) => {
      if (network !== name) {
          setNetwork(name);
          wallets[wallet.name].instance.disconnect();
      }
      setNetworkModalOpen(false);
  }

  return (
    <header>
      <div className='leftH'>
        <img src={Logo} alt='η' className='logo' title='EtaSwap' />
        <Link to='/' className='link'>
          <div className='headerItem'>Swap</div>
        </Link>
        <Link to='/tokens' className='link'>
          <div className='headerItem'>Tokens</div>
        </Link>
        <a href='https://docs.etaswap.com/' target='_blank' className='link'>
          <div className='headerItem'>Docs</div>
        </a>
      </div>
      <div className='rightH'>
        <div className='headerItem' onClick={() => setNetworkModalOpen(true)}>
          <img src={HederaLogo} alt={network} className='logo' />
          Hedera {network}
        </div>
        {!!wallet?.address
          ? <>{wallet?.address}< div className='connectButton'
                onClick={() => disconnectWallet()}
            ><img className='disconnectIcon' src={Disconnect} alt='disconnect'/></div></>
          : <div className='connectButton'
                 onClick={() => setWalletModalOpen(true)}
            >Connect Wallet</div>
        }
      </div>
      <Modal open={networkModalOpen} footer={null} onCancel={() => {
        setNetworkModalOpen(false)
      }} title="Select network">
        <div className='modalContent'>
          {networks.map((network, i) => {
            return (
              <div className='networkChoice' key={i} onClick={() => selectNetwork(network.name)}>
                <img src={HederaLogo} alt={network.title} className="networkLogo"/>
                <div className='networkName'>{network.title}</div>
              </div>
            )
          })}
        </div>
      </Modal>
      <Modal open={walletModalOpen} footer={null} onCancel={() => {
        setWalletModalOpen(false)
      }} title="Select wallet">
        <div className='modalContent'>
          {Object.values(wallets).map(({ name, title, icon }, i) => {
            return (
              <button className='walletChoice' key={i} onClick={() => connectWallet(name)}>
                <img src={icon} alt={title} title={title} className="walletLogo"/>
              </button>
            )
          })}
        </div>
      </Modal>
    </header>
  )
}

export default Header