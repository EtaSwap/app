import {Modal} from "antd";
import React from "react";

export const ConnectWalletModal = ({walletModalOpen, connectWallet, wallets, setWalletModalOpen}) => (
    <Modal open={walletModalOpen} footer={null} onCancel={() => {
        setWalletModalOpen(false)
    }} title="Select wallet">
        <div className='modalContent'>
            {Object.values(wallets).map(({name, title, image}, i) => {
                return (
                    <button className='walletChoice' key={i} onClick={() => connectWallet(name)}>
                        <img src={image} alt={title} title={title} className="walletLogo"/>
                    </button>
                )
            })}
        </div>
    </Modal>
)

