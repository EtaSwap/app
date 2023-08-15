import React from 'react'

function Tokens(props) {
  const { tokens } = props;
  console.log(tokens);
  console.log([...tokens]);
  return (
    <div style={{width: "100vw", height: "100%"}}>
      <div className=''>
      <h1 style={{textAlign: "center", mb: "5px"}} >This tokens are available to swap:</h1>
      </div>
      <div style={{display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 20, margin: "0 auto", alignItems: "center", justifyContent: "center"}}>
      {[...tokens].map((token) => {
        return (
          <div className='tokenChoice' key={token[0]}>
            <div className="pulsating-img-container">
                { token[1].icon? <img src={token[1].icon} alt={token[1].symbol} className="tokenLogo"/> : '' }
            </div>
            <div className='tokenChoiceNames'>
              <div className='tokenName'>
                {token[1].name}
              </div>
              <div className='tokenTicker'>
                {token[1].symbol} ({token[1].address})
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