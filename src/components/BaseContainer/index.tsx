import * as React from 'react';
import { Box, BoxProps } from 'grommet';
import { Head } from 'components';
import { MainFooter } from 'components';
import { withTheme } from 'styled-components';
import { IStyledChildrenProps } from 'interfaces';
import './notifications.css';
import Header from '../Header/PageHeader';
import SideNav from '../SideNav/SideNav'
import { useStores } from 'stores';
import './styles.scss'
import MessageDismiss from 'ui/message/Message';
import MaintenanceWrapper from './MaintenanceWrapper';
import MaintenancePopup from './MaintenancePopup';

export const BaseContainer: React.FC<IStyledChildrenProps<BoxProps>> = withTheme(
  ({ theme, children, ...props }: IStyledChildrenProps<BoxProps>) => {
    // const { palette, container } = theme;
    // const { minWidth, maxWidth } = container;
    const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
    const { theme: Theme } = useStores();



    return (
      <>
        {/*<div className={styles.backgroundImage} />*/}
        {/*<div className={styles.blur} />*/}
        <div
          style={{
            // minHeight: '100%',
            overflowY: "auto",
            overflowX: 'hidden',
          }}

        >
          <SideNav />
          <Header forceUpdate={forceUpdate} />

          <div
            className={`${Theme.currentTheme} base`}
            id="base"
            {...props}
          >
            {/* <p className={`${Theme.currentTheme} domain-p`}>
                Feb 2022: This <b>secretswap.net</b> is your new <b>official</b> SecretSwap home to <b>bookmark </b> and for the only official <b>Telegram</b>
                <img width="24" src="/static/icon-telegram-white.svg" />
                channel <b>join</b> <a href="https://t.me/secretswapnet"> secretswapnet</a>
            </p> */}
            <div id="notifications_container"></div>
            {children}
            <div className={`bridge_link__container`}><a href="https://bridge.scrt.network/">Bridge your assets to Secret Network</a></div>
            <div className='social-media-group'>
                <a href="https://twitter.com/secret_swap" target="_blank" className='btn-expand'>
                    <img className="social-media-icon" src="/static/twitter-icon.png" alt='Twitter Icon'/>
                </a>
                <a href="https://discord.gg/mvc9KFvykM" target="_blank" className='btn-expand'>
                    <img className="social-media-icon" src="/static/discord-icon.png" alt='Discord Icon'/>
                </a>
                <a href="https://forum.scrt.network/c/secretswap/48" target="_blank" className='btn-expand'>
                    <img className="social-media-icon" src="/static/forum-icon.png" alt='Forum Icon'/>
                </a>
                <a href="https://t.me/secretswapnet" target="_blank" className='btn-expand'>
                    <img className="social-media-icon" src="/static/telegram-icon.png" alt='Telegram Icon'/>
                </a>
            </div>
            <div className={`secured_container`}>
              <a href="https://scrt.network/"><img src="/static/securedby.svg" alt="" /></a>
            </div>
            <div className="hidden" id="menu">
              <div className={`${Theme.currentTheme}`}>
                  <div>
                    <a href="/swap">Swap</a>
                    <a href="/earn#Details">Earn</a>
                  </div>
              </div>
            </div>
          </div>
          {/* <MainFooter /> */}
        </div>
        <MaintenancePopup />
        <MaintenanceWrapper />
      </>
    );
  },
);
