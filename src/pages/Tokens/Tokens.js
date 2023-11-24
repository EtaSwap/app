import React, {useEffect} from 'react'
import './Tokens.css'

function Tokens({ tokens }) {

    useEffect(() => {
        console.log('Render');
    }, []);

  return (
    <div className='tokens'>
      <div className=''>
        <h1 className={'tokensHeader'}>These tokens are available to swap:</h1>
      </div>
      <div style={{display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 20, margin: "0 auto", alignItems: "center", justifyContent: "center"}}>
      {[...tokens]
          .map(token => token[1])
          .sort((a, b) =>
          a.providers.length > b.providers.length
              ? -1
              : (a.providers.length === b.providers.length
                      ? (a.name > b.name ? 1 : -1)
                      : 1
              )
      ).map((token) => {
        return (
          <div className='tokenChoice' key={token.solidityAddress}>
            <div className="pulsating-img-container">
                { token.icon? <img src={token.icon} alt={token.symbol} className="tokenLogo"/> : '' }
            </div>
            <div className='tokenChoiceNames'>
              <div className='tokenName'>
                {token.name}
              </div>
              <div className='tokenTicker'>
                {token.symbol} ({token.address})
                </div>
            </div>
            </div>
        )
      })}
    </div>
    </div>
  )
}

export default Tokens
