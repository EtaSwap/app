import React, { useState } from 'react'
import HederaLogo from '../img/hedera-logo.png'
import Logo from '../logo.svg'
import {Link} from 'react-router-dom'
import Disconnect from '../img/disconnect.png'
import { Modal } from 'antd';

const networks = [
    { name: 'testnet', title: 'Hedera testnet' },
    { name: 'mainnet', title: 'Hedera mainnet' },
];

function Header({ connect, connectionData, setConnectionData, network, setNetwork, initHashconnect }) {
    const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const connectWallet = () => {
      console.log(initHashconnect());
    initHashconnect()();
    // connect.connectToLocalWallet();
      // initHashconnect();
  }

  const disconnectWallet = () => {
    connect.disconnect(connectionData?.topic);
    setConnectionData(null);
  }

  const selectNetwork = (name) => {
      if (network !== name) {
          setNetwork(name);
          connect.disconnect(connectionData?.topic);
          connect.clearConnectionsAndData();
          setConnectionData(null);
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
        {!!connectionData?.accountIds?.[0]
          ? <>{connectionData?.accountIds?.[0]}< div className='connectButton'
                onClick={() => disconnectWallet()}
            ><img className='disconnectIcon' src={Disconnect} alt='disconnect'/></div></>
          : <div className='connectButton'
                 onClick={() => connectWallet()}
            >Connect HashPack</div>
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
    </header>
  )
}

export default Header