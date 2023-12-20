import {IAssociatedButton} from "../../../../models";
import './AssociateNewToken.css'

export interface IAssociateNewTokenProps{
    handleClick: (value: IAssociatedButton) => void;
    associatedButtons: IAssociatedButton[];
}

const AssociateNewToken = ({associatedButtons, handleClick}: IAssociateNewTokenProps) => {
    return <>
        {associatedButtons.map((e: IAssociatedButton, indexButton) => <div key={indexButton} className={'associate-button'}>
        <button onClick={() => handleClick(e)} className={'associate-button__button'}>Associate {e.name}
        <span>Token is not associated with your account</span></button>
    </div>)}
        </>
}

export default AssociateNewToken
