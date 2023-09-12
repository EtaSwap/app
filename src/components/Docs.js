import React from 'react'

const Docs = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: "center" }}>
      <div style={{ width: '50%', backgroundColor: 'white', opacity: 0.7, padding: '20px', textAlign: 'left', boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)', color: "black", margin: "auto", borderRadius: "1%" }}>
        <h3 style={{textAlign: 'center'}}>Instruction</h3>
        <p>1. This is an Beta version of EtaSwap DEX aggregator</p>
        <p>2. EtaSwap is looking best prices for tokens you want to swap among DEX-es and processing your swap.</p>
        <p>3. You have to have some HBAR for gas fees to make swap.</p>
        <p>4. <b>IMPORTANT!</b> Before making swap make sure you associated necessary tokens to your account. Otherwise transaction will fail. List of token addresses you can find on tab "tokens".</p>
        <p>5. Each swap operation contains two transactions that you have to sign by your wallet: first - spending approval (let EtaSwap to spend defined amount of source token from your account) and second - exactly swap operation).</p>
        <p>6. Default slippage tolerance is 2.5%, you can adjust it, clicking on cog wheel on main screen.</p>
        <p>7. Smart contract addresses</p>
        <p>
          &nbsp;&nbsp;&nbsp;Exchange: 0x000000000000000000000000000000000039282b<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SaucerSwapAdapter: 0x00000000000000000000000000000000003929bc<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PangolinAdapter: 0x00000000000000000000000000000000003929cd<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;HeliSwapAdapter: 0x00000000000000000000000000000000003929d6<br/>

          &nbsp;&nbsp;&nbsp;SaucerSwapOracle: 0xc47037963fad3a5397cca3fef5c1c95839dc6363<br/>
          &nbsp;&nbsp;&nbsp;PangolinOracle: 0xfa7206b4c9d46af2e2f7f3b1bd4d3aa2aeca6e71<br/>
          &nbsp;&nbsp;&nbsp;HeliSwapOracle: 0x51851a39da39c53f9b564cfdf7e6f55dc8850225<br/>
        </p>
        <p>8. In case of any bugs or improvements proposals please contact by discord or telegram. Keep in mind that product is Beta version, so improvements is on the way.</p>
        <p>9. API, documentation for integrations purpose is under development. It will be ready soon.</p>
        <p>10. At the moment there are three active DEX-es on Hedera: SaucerSwap, Pangolin and HeliSwap. If you are working on another one and interested in integration - please contract by discord or telegram.</p>
        <p>11. Limited amount of tokens added at the moment. Other tokens (around 100-150) will be added soon.</p>
      </div>
    </div>
  )
}

export default Docs