import React, { Component } from 'react';
import styles from '../styles.styl';
import cn from 'classnames';
import { Accordion, Grid, Icon, Image, Input, Segment } from 'semantic-ui-react';
import SoftTitleValue from '../../SoftTitleValue';
import DepositContainer from '../DepositContainer';
import WithdrawStakeContainer from './WithdrawStakeContainer';
import { UserStoreEx } from '../../../../stores/UserStore';
import { observer } from 'mobx-react';
import { Text } from '../../../Base';
import stores, { useStores } from 'stores';
import Theme from 'themes';
import MigrateAssets from '../../MigrateTokens';
import { DetailsTab } from './DetailsTab';
import { RewardsTab } from './RewardsTab';
import { notify } from '../../../../blockchain-bridge';
import UnstakeButton from './UnstakeButton';
import StakeButton from './StakeButton';
import { RewardsToken } from '..';

@observer
class InfinityEarnRow extends Component<
  {
    userStore: UserStoreEx;
    token: RewardsToken;
    notify: Function;
    callToAction: string;
    theme: Theme;
    isSefiStaking?: boolean;
  },
  {
    activeIndex: Number;
    stakeValue: string;
    unstakeValue: string;
    withdrawValue: string;
    updateWithdrawStake: boolean;
    claimButtonPulse: boolean;
    pulseInterval: number;
    secondary_token: any;
  }
> {
  state = {
    activeIndex: -1,
    stakeValue: '0.0',
    unstakeValue: '0.0',
    withdrawValue: '0.0',
    updateWithdrawStake: false,
    claimButtonPulse: true,
    pulseInterval: -1,
    secondary_token: {
      image: '',
      symbol: '',
    },
  };

  componentDidMount() {
    //auto open for SEFI STAKING page
    if (this.props.isSefiStaking) {
      setTimeout(() => {
        this.handleClick('', { index: 0 });
      }, 100);
    }
  }

  handleChangeStake = event => {
    this.setState({ stakeValue: event.target.value });
  };

  handleChangeUnstake = event => {
    this.setState({ unstakeValue: event.target.value });
  };

  handleChangeWithdraw = () => {
    this.setState({ withdrawValue: this.state.withdrawValue });
  };

  handleUpdateWithdrawStake = () => {
    this.setState({ updateWithdrawStake: !this.state.updateWithdrawStake });
  };

  handleClick = (e, titleProps) => {
    const { index } = titleProps;
    const { activeIndex } = this.state;
    const newIndex = activeIndex === index ? -1 : index;
    if (activeIndex === -1) {
      this.props.userStore.refreshTokenBalanceByAddress(this.props.token.lockedAssetAddress);
      this.props.userStore.refreshRewardsBalances('', this.props.token.rewardsContract);
    }
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
  render() {

    const isDetails = window.location.hash === '#Details';
    const isRewards = window.location.hash === '#Rewards';

    if (!isDetails && !isRewards) {
      window.location.hash = 'Details';
      return <></>;
    }

    const style = `${styles.accordion} ${styles[this.props.theme.currentTheme]}`;
    const { activeIndex } = this.state;
    const _symbols = this.props.token.lockedAsset?.toUpperCase().split('-');

    let tokenName;
    if (_symbols[1] == 'SEFI') {
      tokenName = _symbols[1] + ' - ' + this.unCapitalize(_symbols[2]);
    } else if (_symbols[2] == 'SEFI') {
      tokenName = this.unCapitalize(_symbols[1]) + ' - ' + _symbols[2];
    } else {
      tokenName = this.unCapitalize(_symbols[1]) + ' - ' + this.unCapitalize(_symbols[2]);
    }
    const isDeprecated = this.props.token.deprecated && this.props.token.deprecated_by !== '';
    let title = 'INFINITY POOL';

    return (
      <Accordion className={cn(style)}>
        <Accordion.Title
          active={activeIndex === 0}
          index={0}
          onClick={this.handleClick}
          className={`${styles.assetRow} ${styles.responsive_row}`}
        >
          {
            <div className={cn(styles.assetIcon)}>
              <Image src={'/static/token-images/sefi.svg'} rounded size="mini" />
              <Image src={'/static/infinity-icon.png'} rounded size="mini" />
            </div>
          }

          <div className={cn(styles.title_item__container)}>
            <SoftTitleValue title={title} subTitle="    " />
          </div>
          <div></div>
          <div></div>
          <Icon
            className={`${styles.arrow}`}
            style={{
              color: this.props.theme.currentTheme == 'dark' ? 'white' : '',
            }}
            name="dropdown"
          />
        </Accordion.Title>
        <Accordion.Content
          className={`${styles.content} ${styles[this.props.theme.currentTheme]}`}
          active={activeIndex === 0}
        >
          {this.props.token.deprecated ? (
            <div className="maintenance-warning">
              <h3>
                <Icon name="warning circle" />A new version of this earn pool is live. You can migrate by clicking the
                button below
              </h3>
            </div>
          ) : (
            <></>
          )}

          <div>
            <Segment basic>
              <Grid className={cn(styles.content2)} columns={2} relaxed="very" stackable>
                <Grid.Column>
                  {isDeprecated ? (
                    <>
                      <h1 style={{ color: this.props.theme.currentTheme == 'dark' ? 'white' : '#1B1B1B' }}>
                        Earn on the new pool!
                      </h1>
                      <MigrateAssets
                        balance={this.props.token.deposit}
                        oldRewardsContract={this.props.token.rewardsContract}
                        newRewardsContract={this.props.token.deprecated_by}
                        lockedAsset={this.props.token.lockedAsset}
                        lockedAssetAddress={this.props.token.lockedAssetAddress}
                      >
                        <p style={{ color: this.props.theme.currentTheme == 'dark' ? 'white' : '#1B1B1B' }}>
                          Migrate your tokens here.
                          <button className={`migrate-solid-button ${stores.theme.currentTheme}`}>Migrate</button>
                        </p>
                      </MigrateAssets>
                    </>
                  ) : (
                    <DepositContainer
                      title="Stake"
                      value={this.state.stakeValue}
                      action={
                        !isDeprecated && (
                          <>
                            <Grid columns={1} stackable relaxed={'very'}>
                              <Grid.Column
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-start',
                                }}
                              >
                                <StakeButton
                                  props={this.props}
                                  token={this.props.token}
                                  value={this.state.stakeValue}
                                  changeValue={this.handleChangeStake}
                                  togglePulse={this.togglePulse}
                                  setPulseInterval={this.setPulseInterval}
                                />
                              </Grid.Column>
                            </Grid>
                          </>
                        )
                      }
                      onChange={this.handleChangeStake}
                      balance={this.props.token.balance}
                      currency={this.props.token.lockedAsset}
                      price={this.props.token.price}
                      balanceText="Available"
                      unlockPopupText="Staking balance and rewards require an additional viewing key."
                      tokenAddress={this.props.token.lockedAssetAddress}
                      userStore={this.props.userStore}
                      theme={this.props.theme}
                    />
                  )}
                </Grid.Column>
                <Grid.Column>
                  <DepositContainer
                    title="Unstake"
                    value={this.state.unstakeValue}
                    onChange={this.handleChangeUnstake}
                    action={
                      <Grid>
                        <Grid.Column style={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                }}>
                          <div style={{marginRight: "10px", textAlign: "right"}}>
                            Unstaking has a 10 day<br/>zero rewards unlock period
                          </div>
                          <span style={{marginRight: "-0.25em"}}>
                            <UnstakeButton
                              props={this.props}
                              token={this.props.token}
                              value={this.state.unstakeValue}
                              changeValue={this.handleChangeUnstake}
                              onUpdate={this.handleUpdateWithdrawStake}
                              togglePulse={this.togglePulse}
                              setPulseInterval={this.setPulseInterval}
                            />
                          </span>
                        </Grid.Column>
                      </Grid>
                    } //({props: this.props, value: this.state.withdrawValue})}
                    balance={this.props.token.deposit}
                    currency={this.props.token.lockedAsset}
                    price={this.props.token.price}
                    balanceText="Available"
                    unlockPopupText="Staking balance and rewards require an additional viewing key."
                    tokenAddress={this.props.token.rewardsContract}
                    userStore={this.props.userStore}
                    theme={this.props.theme}
                  />
                </Grid.Column>
              </Grid>
              <Grid className={cn(styles.content2)} columns={2} relaxed="very" stackable>
                <Grid.Column>
                </Grid.Column>
                <Grid.Column>
                    <WithdrawStakeContainer
                    props={this.props}
                    value={this.state.withdrawValue}
                    onUpdate={this.handleUpdateWithdrawStake}
                    updateWithdrawStake={this.state.updateWithdrawStake}
                    currency={this.props.token.lockedAsset}
                    balanceText="Available unstaked tokens"
                    unlockPopupText="Staking balance and rewards require an additional viewing key."
                    tokenAddress={this.props.token.rewardsContract}
                    userStore={this.props.userStore}
                    theme={this.props.theme}
                    token={this.props.token}
                    />
                </Grid.Column>
              </Grid>
              <Grid className={cn(styles.content2)} columns={2} relaxed="very" stackable>
                <Grid.Column>
                <Image style={{marginBottom: '15px'}} src={'/static/infinity-pool.png'}/>
                  <Text
                    size="medium"
                    style={{
                      padding: '20 20 0 20',
                      cursor: 'auto',
                      textAlign: 'center',
                      fontFamily: 'Poppins,Arial',
                      color: this.props.theme.currentTheme == 'dark' ? 'white' : '#1B1B1B',
                    }}
                  >
            Every time you Stake, Unstake, or Claim the contract will automagically claim your rewards for you
          </Text>
          </Grid.Column>
          <Grid.Column>
              {isDetails && (
                  <DetailsTab
                    notify={notify}
                    token={this.props.token}
                    userStore={this.props.userStore}
                    theme={this.props.theme}
                  />
                )}
                {isRewards && (
                  <RewardsTab
                    notify={notify}
                    token={this.props.token}
                    userStore={this.props.userStore}
                    theme={this.props.theme}
                  />
                )}
          </Grid.Column>
              </Grid>
            </Segment>
          </div>
        </Accordion.Content>
      </Accordion>
    );
  }
}

export default InfinityEarnRow;
