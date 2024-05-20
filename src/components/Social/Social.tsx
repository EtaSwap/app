import React from 'react'
import './Social.css'

function Social() {
    return (
        <div className="social">
            <a className="social__link" href="https://twitter.com/eta_swap" target="_blank" title="Twitter">
                <svg className="social__image">
                    <use href="#icon-twitter" xlinkHref="#icon-twitter"></use>
                </svg>
            </a>
            <a className="social__link" href="https://t.me/etaswap" target="_blank" title="Telegram">
                <svg className="social__image">
                    <use href="#icon-telegram" xlinkHref="#icon-telegram"></use>
                </svg>
            </a>
            <a className="social__link" href="https://www.reddit.com/r/etaswap/" target="_blank" title="Reddit">
                <svg className="social__image">
                    <use href="#icon-reddit" xlinkHref="#icon-reddit"></use>
                </svg>
            </a>
            <a className="social__link" href="https://discord.gg/8uHPAT4Nhx" target="_blank" title="Discord">
                <svg className="social__image">
                    <use href="#icon-discord" xlinkHref="#icon-discord"></use>
                </svg>
            </a>
            <a className="social__link" href="https://github.com/EtaSwap" target="_blank" title="GitHub">
                <svg className="social__image">
                    <use href="#icon-github" xlinkHref="#icon-github"></use>
                </svg>
            </a>
        </div>
    )
}

export default Social;
