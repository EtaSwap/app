import React from 'react'
import HederaLogo from '../hedera-logo.png'
import Logo from '../logo.svg'
import {Link} from 'react-router-dom'

const connectWallet = (connect, isConnected, connectionData, setConnectionData) => {
  if (isConnected) {
    connect.disconnect(connectionData?.topic);
    setConnectionData(null);
  } else {
    connect.connectToLocalWallet();
  }
}

function Header(props) {
  const {connect, connectionData, setConnectionData} = props;
  return (
    <header>
      <div className='leftH'>
        <img src={Logo} alt='η' className='logo' />
        <Link to='/' className='link'>
        <div className='headerItem'>Swap</div>  
        </Link>
        <Link to='/tokens' className='link'>
        <div className='headerItem'>Tokens</div>
        </Link>
        <Link to='/docs' className='link'>
        <div className='headerItem'>Docs</div>
        </Link>
        </div>
      <div className='rightH'>
        <div className='headerItem'>
          <img src={HederaLogo} alt='Hedera testnet' className='logo' />
          Hedera testnet
        </div>
        <div className='connectButton' key={connectionData?.accountIds?.[0]}
        onClick={() => connectWallet(connect, connectionData, setConnectionData)}
         >{connectionData?.accountIds?.[0] || "Connect" }</div>
        </div>
    </header>
  )
}

export default Header