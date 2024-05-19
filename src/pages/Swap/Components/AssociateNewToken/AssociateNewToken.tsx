import './AssociateNewToken.css'
import {Token} from "../../../../types/token";

export interface IAssociateNewTokenProps{
    handleClick: (value: Token) => void;
    associatedButtons: Token[];
}

const AssociateNewToken = ({associatedButtons, handleClick}: IAssociateNewTokenProps) => {
    return <>
        {associatedButtons.map((token: Token) => {
            return <div key={token.solidityAddress} className={'associate-button'}>
                <button onClick={() => handleClick(token)} className='button swap__button'>
                    Associate {token.symbol} ({token.address})
                    <span className='swap__button-subtitle'>Token is not associated with your account</span>
                </button>
            </div>
        })}
        </>
}

export default AssociateNewToken
