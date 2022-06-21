import React, { useEffect, useState } from 'react';
import { useHistory, Link } from 'react-router-dom'
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores';
import {SefiModal} from '../SefiModal';
import  "./page-header.scss";
import { notify } from '../../blockchain-bridge/scrt/utils';
import { formatWithTwoDecimals, sleep } from 'utils';

export const showMobileMenu = () => {
    const header = document.getElementById("header");
    const menu = document.getElementById("menu");
    const hamburger = document.getElementById("hamburger-menu");
    const base = document.getElementById("base");
    if (menu.classList.contains("hidden")) {
        menu.classList.remove("hidden")
        header.classList.add("checked")
        menu.classList.add("checked")
        hamburger.classList.add("checked")
        base.classList.add("checked")
        document.body.style.overflow = "hidden";
    }
    else {
        header.classList.remove("checked")
        menu.classList.remove("checked")
        hamburger.classList.remove("checked")
        base.classList.remove("checked")
        menu.classList.add("hidden")
        document.body.style.overflow = "auto";
    }
}

// Import Icons
const PageHeader = observer(({forceUpdate}:{forceUpdate:any}) =>{

    const governancePaths = ['governance','proposal','sefistaking'];
    const { user, tokens,userMetamask,theme } = useStores();
    const [prices, setPrices] = useState({'sefi' : '0.0000', 'scrt' : '0.00'})

    const handleSignIn = async()=>{
        if(user.isKeplrWallet){
            user.signIn();
        }else{
            console.log("Not keplr extention")
            notify("error","It seems like you don't have Keplr extention installed in your browser. Install Keplr, reload the page and try again")
        }
    }

    const getAddress = ():string=>{
        if(user.address){
            return (user?.address?.substring(0,7) +'...' + user?.address?.substring(user?.address?.length - 3,user?.address?.length));
        }else{
            return '';
        }
    }
    function switchTheme(){
        theme.switchTheme();
        forceUpdate();
        // window.location.reload();
    }

    useEffect(() => {
        const asyncWrapper = async () => {
            for (let i = 0; i < 4; i++) {
                if (globalThis.config['PRICE_DATA']["SEFI/USDT"]) {
                    try {
                        setPrices({'sefi' : String(globalThis.config['PRICE_DATA']["SEFI/USDT"].price).slice(0,6),
                        'scrt' : formatWithTwoDecimals(globalThis.config['PRICE_DATA']["SCRT/USD"].price)})
                    } catch (error) {
                    }
                    break;
                }
                await sleep(1000);
            }
        }
        asyncWrapper().then(() => { });
    }, [])

    return(
        <>
            <div className={`${theme.currentTheme} page-header`} id="header">
                    <div className="page-header-left">
                        <img src="/static/menu-icon.svg" alt="Menu" id="hamburger-menu" onClick={showMobileMenu}/>
                        <a href="https://www.secretswap.net/">
                            {(theme.currentTheme === 'light')
                                ? <img src='/static/secret-swap-dark.png' alt="SecretSwap logo" />
                                : <img src='/static/secret-swap-light.png' alt="SecretSwap logo" />
                            }

                        </a>
                        <div className="theme__container">
                            {(theme.currentTheme == 'light')?
                                <img onClick={switchTheme} src='/static/sun.svg' alt="Key Icon"/> :
                                <img onClick={switchTheme} src='/static/moon.svg' alt="Key Icon"/>
                            }
                        </div>
                        <div className="pricing">
                            <img src='/static/price-logo-sefi.png' alt='SeFi Price Logo'></img>
                            <span className="token">SEFI</span> ${prices['sefi']}
                        </div>
                        <div className="pricing">
                            <img src='/static/price-logo-scrt.png' alt='SCRT Price Logo'></img>
                            <span className="token">SCRT</span> ${prices['scrt']}
                        </div>
                    </div>

                    <div className="page-header-right">
                        <div className="kpl_container">
                            <div className="wallet-icon">
                                <img src="/static/wallet-icon.svg" alt="wallet icon"/>
                            </div>
                    {(!user.address || !user.isAuthorized)?
                        <div>

                            {
                                (user.isUnconnected == 'true')&&
                                    <span onClick={handleSignIn} className="connect_btn">Click to Connect</span>
                            }
                            {
                                (user.isUnconnected === 'UNINSTALLED')&&
                                    <span onClick={handleSignIn} className="connect_btn">Install Keplr to Continue</span>
                            }
                        </div>
                        :
                        <div className="address_container">
                            <p>{getAddress()}</p>
                            <span className="separator">|</span>
                            <div className="balance">
                                <p>{user.balanceSCRT}</p>
                                <p>SCRT</p>
                            </div>
                        </div>
                    }
                    </div>
                    </div>
                </div>
        </>
    )
})

export default PageHeader;
