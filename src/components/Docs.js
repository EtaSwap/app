import React from 'react'

const Docs = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: "center" }}>
      <div style={{ width: '50%', backgroundColor: 'white', opacity: 0.7, padding: '20px', textAlign: 'left', boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)', color: "black", margin: "auto", borderRadius: "1%" }}>
        <h3 style={{textAlign: 'center'}}>Instruction</h3>
        <p>1. This is an MVP of EtaSwap DEX aggregator. At the moment it deployed to testnet, so you have to have hedera testnet account to use it.</p>
        <p>2. EtaSwap is looking best prices for tokens you want to swap among DEX-es and processing your swap.</p>
        <p>3. You have to have some HBAR for gas fees to make swap.</p>
        <p>4. <b>IMPORTANT!</b> Before making swap make sure you associated necessary tokens to your account. Otherwise transaction will fail. List of token addresses you can find on tab "tokens".</p>
        <p>5. Each swap operation contains two transactions that you have to sign by your wallet: first - spending approval (let EtaSwap to spend defined amount of source token from your account) and second - exactly swap operation).</p>
        <p>6. Default slippage tolerance is 2.5%, you can adjust it, clicking on cog wheel on main screen.</p>
      </div>
    </div>
  )
}

export default Docs