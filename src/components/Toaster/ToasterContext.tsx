import React, {createContext, ReactNode, useContext} from 'react';
import {toast} from "react-toastify";
import './Toaster.css';
import 'react-toastify/dist/ReactToastify.css';
import {toastTypes} from "../../models/Toast";

interface ToasterContextProps {
    showToast: (title: string, message: string, type: toastTypes, transactionIdToCopy?: string) => void;
}

const ToasterContext = createContext<ToasterContextProps | undefined>(undefined);

export interface IToasterProviderProps {
    children: ReactNode;
}

export const ToasterProvider = ({children}: IToasterProviderProps) => {

    const toastOptions = {
        position: toast.POSITION.TOP_RIGHT,
        autoClose: 6000,
        closeButton: false,
        className: 'toast-wrapper'
    };
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Can not copy to clipboard: ', err);
        }
    };
    const showToast = (
        title: string,
        message: string,
        type: toastTypes,
        transactionIdToCopy?: string,
    ) => {
        toast[type](<div className={`custom-toast toast-${type}`}>
            <div className="toast-header">
                <strong className="mr-auto">{title}</strong>
            </div>
            <div className="toast-body">{message}</div>
            {transactionIdToCopy
                ? <a
                    href='#'
                    className="toast-clipboard"
                    onClick={() => copyToClipboard(transactionIdToCopy)}
                >Copy ID to clipboard</a>
                : ''
            }
        </div>, toastOptions);
    };

    return (
        <ToasterContext.Provider value={{showToast}}>
            {children}
        </ToasterContext.Provider>
    );
};

export const useToaster = (): ToasterContextProps => {
    const context = useContext(ToasterContext);
    if (!context) {
        throw new Error('useToaster must be used within a ToasterProvider');
    }
    return context;
};
