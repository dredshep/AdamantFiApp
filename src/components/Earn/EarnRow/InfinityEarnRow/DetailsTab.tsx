import BigNumber from 'bignumber.js';
import React from 'react';
import styles from '../styles.styl';
import cn from 'classnames';
import { CosmWasmClient } from 'secretjs';
import { Accordion, Grid, Icon, Image, Segment, Container } from 'semantic-ui-react';
import SoftTitleValue from '../../SoftTitleValue';
import { UserStoreEx } from 'stores/UserStore';
import { TabsHeader } from './TabsHeader';
import { observer } from 'mobx-react';
import Theme from 'themes';
import { ModalExplanation, ModalMultiplierTip, formatRoi } from '../../APRModalExp';
import { getAPRStats, RewardsToken } from '..';
import { formatZeroDecimals } from 'utils';
import { infinityRewardTokenInfo } from 'services';

@observer
export class DetailsTab extends React.Component<
{
  userStore: UserStoreEx;
  notify: Function;
  token: RewardsToken;
  theme: Theme;
  isSefiStaking?: boolean;
},
{
  activeIndex: Number;
  depositValue: string;
  withdrawValue: string;
  claimButtonPulse: boolean;
  pulseInterval: number;
  secondary_token: any;
}
> {
  state = {
    activeIndex: -1,
    depositValue: '0.0',
    withdrawValue: '0.0',
    claimButtonPulse: true,
    pulseInterval: -1,
    secondary_token: {
      image: '',
      symbol: '',
    },
  };
  render() {

    return (
      <Container className={`${styles.containerStyle} ${styles[this.props.theme.currentTheme]}`}>
        <TabsHeader />
        <Grid textAlign='center' verticalAlign='middle' columns='equal'>
          {infinityRewardTokenInfo
            .map((tokenInfo, i) => {
              return <div key={tokenInfo.info.symbol} className={`${styles.detail} ${styles[this.props.theme.currentTheme]}`}>
                <Image className={`${styles.image}`} src={tokenInfo.info.img} rounded size="mini" />
                <div className={`${styles.symbol}`}>{`${tokenInfo.info.symbol}`} </div>
                <div className={`${styles.apr}`}>
                  <SoftTitleValue
                    title={
                      <div className="earn_center_ele">
                        {formatRoi(getAPRStats(this.props.token, tokenInfo.info.price, tokenInfo.info.symbol === 'SEFI')?.apr, true)}
                        {<p style={{ marginLeft: '4px', fontFamily: 'poppins', fontSize: '10px', zIndex: '10' }}>
                          <ModalExplanation token={this.props.token} theme={this.props.theme} infinityPoolPrice={tokenInfo.info.price} infinityPoolSymbol={tokenInfo.info.symbol}>
                            <img width="14px" src="/static/info.svg" alt="" />
                          </ModalExplanation>
                        </p>}
                      </div>
                    }
                    subTitle='APR'
                    isDetail={true}
                  /></div>
                {tokenInfo.info.symbol === 'SEFI' ?
                  (<><div className={`${styles.tvl} ${styles[this.props.theme.currentTheme]}`}><SoftTitleValue
                    title={`$${formatZeroDecimals(Math.round((tokenInfo.info.numStaked / 1000000) * tokenInfo.info.price) || 0)}`}
                    subTitle='TVL'
                    isDetail={true}
                  /></div>
                    <div className={`${styles.multiplier} ${styles[this.props.theme.currentTheme]}`}><SoftTitleValue
                      title={
                        <div className="earn_center_ele">
                          {tokenInfo.info.multiplier}x
                          <p style={{ marginLeft: '4px', fontFamily: 'poppins', fontSize: '10px' }}>
                            <ModalMultiplierTip multiplier={tokenInfo.info.multiplier} theme={this.props.theme}>
                              <img width="14px" src="/static/info.svg" alt="" />
                            </ModalMultiplierTip>
                          </p>
                        </div>
                      }
                      subTitle='Multiplier'
                      isDetail={true}
                    /></div></>) :
                  (<>
                    <div className={`${styles.tvl}`}></div>
                    <div className={`${styles.multiplier}`}></div>
                  </>)}
              </div>
            })}
        </Grid>
      </Container>
    );
  }
}
