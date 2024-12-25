import React from 'react'
import './Tokens.css'
import {Token} from '../../types/token';
import defaultImage from "../../assets/img/default.svg";

export interface ITokensProps {
    tokens: Token[];
}

function Tokens({tokens}: ITokensProps) {
    return (
        <div className='token'>
            <div className="container">
                <h2 className='token__header'>These tokens are available to swap:</h2>
                <div className='token__choice-wrapper'>
                    {
                        tokens.map((token) => {
                            return (
                                <div className='token__choice' key={token.solidityAddress}>
                                    <img
                                        src={token.icon}
                                        alt={token.symbol}
                                        className="token__choice-logo"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).onerror = null;
                                            (e.target as HTMLImageElement).src = defaultImage;
                                        }}
                                    />
                                    <div className='token__choice-description'>
                                        <div className='token__choice-name'>
                                            {token.symbol}
                                        </div>
                                        <div className='token__choice-address'>
                                            {token.address}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </div>
        </div>
    )
}

export default Tokens
