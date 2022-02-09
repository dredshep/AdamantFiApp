import React from 'react';
import styles from '../styles.styl';
import cn from 'classnames';
import { Accordion, Grid, Icon, Image, Segment, Container } from 'semantic-ui-react';
import SoftTitleValue from '../../SoftTitleValue';
import { UserStoreEx } from 'stores/UserStore';
import { TabsHeader } from './TabsHeader';
import Loader from 'react-loader-spinner';
import { observer } from 'mobx-react';
import { divDecimals, formatWithTwoDecimals, zeroDecimalsFormatter, formatZeroDecimals } from '../../../../utils';
import Theme from 'themes';
import InfinityClaimButton from './InfinityClaimButton';
import { getViewingKey } from '../../../../blockchain-bridge';
import { RewardsToken } from '..';
import { threadId } from 'worker_threads';
import { infinityRewardTokenInfo } from 'services';

export interface InfinityTokenReward {
  rewards: string;
  token_contract: {
    address: string;
    contract_hash: string
  }
}

export interface InfinityReward {
  tokens_rewards: InfinityTokenReward[];
}

@observer
export class RewardsTab extends React.Component<
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
  updateValue: boolean;
  claimButtonPulse: boolean;
  pulseInterval: number;
  secondary_token: any;
  rewardTokens: InfinityReward;
  vkey: any;
}
> {
  state = {
    activeIndex: -1,
    depositValue: '0.0',
    withdrawValue: '0.0',
    updateValue: false,
    claimButtonPulse: true,
    pulseInterval: -1,
    secondary_token: {
      image: '',
      symbol: '',
    },
    rewardTokens: undefined,
    vkey: undefined,
  };
  async componentDidMount() {

    const rewards = await this.getInfinityRewards()

    this.setState({ rewardTokens: rewards })
  }

  handleChangeDeposit = event => {
    this.setState({ depositValue: event.target.value });
  };

  handleChangeWithdraw = event => {
    this.setState({ withdrawValue: event.target.value });
  };

  handleUpdate = async () => {
    const rewards = await this.getInfinityRewards()

    this.setState({ rewardTokens: rewards })
  };

  handleClick = (e, titleProps) => {
    const { index } = titleProps;
    const { activeIndex } = this.state;
    const newIndex = activeIndex === index ? -1 : index;
    // if (activeIndex === -1) {
    //   this.props.userStore.refreshTokenBalanceByAddress(this.props.token.lockedAssetAddress);
    //   this.props.userStore.refreshRewardsBalances('', this.props.token.rewardsContract);
    // }
    this.setState({ activeIndex: newIndex });
  };

  togglePulse = () =>
    this.setState(prevState => ({
      claimButtonPulse: !prevState.claimButtonPulse,
    }));

  clearPulseInterval = () => clearInterval(this.state.pulseInterval);

  setPulseInterval = interval => this.setState({ pulseInterval: interval });

  unCapitalize = s => {
    if (typeof s !== 'string') {
      return '';
    }
    return s.charAt(0).toLowerCase() + s.slice(1);
  };
  getBaseTokenName = (tokenName: string): string => {
    if (!tokenName) {
      return '';
    }

    tokenName = tokenName.toUpperCase();

    if (tokenName == 'SSCRT' || tokenName == 'SEFI' || tokenName == 'SCRT') {
      return tokenName;
    } else {
      if (tokenName.charAt(0) == 'S') {
        return tokenName.slice(1);
      } else {
        return tokenName;
      }
    }
  };

  getInfinityRewards = async () => {

    try {

      const viewingKey = await getViewingKey({
        keplr: this.props.userStore.keplrWallet,
        chainId: this.props.userStore.chainId,
        address: this.props.token.rewardsContract,
      });

      this.setState({ vkey: viewingKey })

      if (viewingKey === undefined) {
        return undefined
      }

      const res = await this.props.userStore.secretjs.queryContractSmart(this.props.token.rewardsContract, {
        rewards: {
          address: this.props.userStore.address, // address of the user that wants to see his balance
          key: viewingKey, // viewing key of the user that wants to see his balance
          height: (await this.props.userStore.secretjs.getBlock()).header.height, // current block height so the reward calculations can be done
        },
      });

      return res

    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  render() {

    return (
      <Container className={`${styles.containerStyle} ${styles[this.props.theme.currentTheme]}`}>
        <TabsHeader />
        <Grid verticalAlign='middle'>
          {this.state.vkey === undefined ? (<Grid.Row centered ><Grid.Column verticalAlign='middle' textAlign='center' className={`${styles.detail} ${styles.label} ${styles[this.props.theme.currentTheme]}`} style={{ width: '250px', margin: '20px 0px 0px 0px', 'fontSize': '16px' }}><strong>Can't view rewards without a viewing key</strong></Grid.Column></Grid.Row>) :
            (<>{this.state.rewardTokens !== undefined ?
              <>
                {infinityRewardTokenInfo
                  .map(tokenInfo => {
                    const reward = this.state.rewardTokens.rewards.tokens_rewards
                      .filter(infTokenReward => {
                        return infTokenReward.token_contract.address === tokenInfo.info.address
                      })

                    return <div key={tokenInfo.info.symbol} className={cn(styles.rewards)}>
                      <Image className={cn(styles.image)} src={tokenInfo.info.img} rounded size="mini" />
                      <div className={cn(styles.name)}>
                        <SoftTitleValue title={tokenInfo.info.symbol} subTitle="    " />
                      </div>
                      <div className={`${styles.label} ${styles[this.props.theme.currentTheme]}`}>
                        {reward.length !== 0
                          ? <strong>{`${divDecimals(reward[0].rewards, tokenInfo.info.decimals)}`}</strong>
                          : <strong>0</strong>
                        }
                      </div>
                    </div>
                  })}
                <div key={'Shhh!'} className={cn(styles.rewards)}>
                  <Image className={cn(styles.image)} src={'/static/infinity-icon.png'} rounded size="mini" />
                  <div className={cn(styles.name)}>
                    <SoftTitleValue title={'Shhh!'} subTitle="    " />
                  </div>
                  <div className={`${styles.label} ${styles[this.props.theme.currentTheme]}`}>
                    <strong>more coming soon</strong>
                    <span style={{ marginLeft: '10px' }}></span>
                  </div>
                </div>
                <Grid.Row textAlign='right' verticalAlign='top' style={{padding: '0px'}}>
                  <Grid.Column width={3} className={cn(styles.rewards, styles.image)} >
                  </Grid.Column>
                  <Grid.Column width={3} className={cn(styles.rewards)}>
                  </Grid.Column>
                  <Grid.Column width={9} className={cn(styles.rewards, styles.rewardsClaim)}>
                    <InfinityClaimButton
                      balance={this.props.token.balance}
                      unlockPopupText={""}
                      secretjs={this.props.userStore.secretjsSend}
                      contract={this.props.token.rewardsContract}
                      symbol={this.props.token.rewardsSymbol}
                      available={this.props.token.rewards}
                      notify={this.props.notify}
                      rewardsToken={this.props.token.rewardsSymbol}
                      rewardsContract={this.props.token.rewardsContract}
                      lockedAssetAddress={this.props.token.lockedAssetAddress}
                      handleUpdate={this.handleUpdate}>
                    </InfinityClaimButton>
                  </Grid.Column>
                </Grid.Row>
              </>
              : <Grid.Row verticalAlign='middle' centered> <Loader className={cn(styles.loader)} /></Grid.Row>} </>)}
        </Grid>
      </Container>
    );
  }
}
