import React, { Component } from 'react';
import styles from '../styles.styl';
import cn from 'classnames';
import { Accordion, Grid, Icon, Image, Segment } from 'semantic-ui-react';
import SoftTitleValue from '../../SoftTitleValue';
import EarnButton from './EarnButton';
import DepositContainer from '../DepositContainer';
import ClaimBox from './ClaimBox';
import { UserStoreEx } from '../../../../stores/UserStore';
import { observer } from 'mobx-react';
import WithdrawButton from './WithdrawButton';
import { formatZeroDecimals } from '../../../../utils';
import { Text } from '../../../Base';
import stores from 'stores';
import Theme from 'themes';
import {ModalExplanation, ModalMultiplierTip} from '../../APRModalExp';
import { aprString, multipliers, tokenImages, RewardsToken } from '..';

@observer
class StandardEarnRow extends Component<
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
  componentDidMount() {
    //auto open for SEFI STAKING page
    if (this.props.isSefiStaking) {
      setTimeout(() => {
        this.handleClick('', { index: 0 });
      }, 100);
    }
  }

  handleChangeDeposit = event => {
    this.setState({ depositValue: event.target.value });
  };

  handleChangeWithdraw = event => {
    this.setState({ withdrawValue: event.target.value });
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

    if(s === 'SEFI' || s === 'SHD' || s.charAt(0) !== 'S')
      return s; // Do not uncapitalize in this case

    return s.charAt(0).toLowerCase() + s.slice(1);
  };
  getBaseTokenName = (tokenName: string): string => {
    if (!tokenName) {
      return '';
    }

    tokenName = tokenName.toUpperCase();

    if (tokenName == 'SSCRT' || tokenName == 'SEFI' || tokenName == 'SCRT' || tokenName == 'ALTER' || tokenName == 'SHD') {
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
    // const style = Number(this.props.token.balance) > 0 ? styles.accordionHaveDeposit : `${styles.accordion} ${styles[this.props.theme.currentTheme]}`;
    const style = `${styles.accordion} ${styles[this.props.theme.currentTheme]}`;
    //this.props.userStore.keplrWallet.suggestToken(this.props.userStore.chainId, );
    const { activeIndex } = this.state;
    const _symbols = this.props.token.lockedAsset?.toUpperCase().split('-');
    let image_primaryToken, image_secondaryToken;

    if(_symbols.length > 1) {
      let tokenName1 = this.getBaseTokenName(_symbols[1]);
      let tokenName2 = this.getBaseTokenName(_symbols[2]);

      // Overide the image for each token
      if (tokenImages[tokenName1]) {
        image_primaryToken = tokenImages[tokenName1];
      }
      if (tokenImages[tokenName2]) {
        image_secondaryToken = tokenImages[tokenName2];
      }
    } else { // SEFI and ALTER (single-coin staking pools)
      image_primaryToken = tokenImages[this.props.token.lockedAsset];
      image_secondaryToken = null;
    }

    let tokenName = this.unCapitalize(_symbols[1]) + ' - ' + this.unCapitalize(_symbols[2]);

    const isDeprecated = this.props.token.deprecated && this.props.token.deprecated_by !== '';
    let title = '';
    if (isDeprecated) {
      title = this.props.token.display_props.label === 'SEFI' ? 'SEFI STAKING (OLD)' : `${tokenName} (OLD)`;
    } else if (this.props.token.display_props.label === 'SEFI') {
      title = 'SEFI STAKING (V2)';
    } else if (this.props.token.display_props.label === 'ALTER') {
      title = 'ALTER STAKING';
    } else {
      title = tokenName;
    }

    return (
      <Accordion className={cn(style)}>
        <Accordion.Title
          active={activeIndex === 0}
          index={0}
          onClick={this.handleClick}
          className={`${styles.assetRow} ${styles.responsive_row}`}
        >
          <div className={cn(styles.assetIcon)}>
            <Image src={image_primaryToken} rounded size="mini" />
            {image_secondaryToken && <Image src={image_secondaryToken} rounded size="mini" />}
          </div>

          <div className={cn(styles.title_item__container)}>
            <SoftTitleValue title={title} subTitle="    " />
          </div>

          <div className={cn(styles.title_item__container)}>
            <SoftTitleValue
              title={
                <div className="earn_center_ele">
                  {aprString(this.props.token)}
                  {!isDeprecated && !this.props.token.zero && (
                    <p style={{ marginLeft: '5px', fontFamily: 'poppins', fontSize: '17px' }}>
                      <ModalExplanation token={this.props.token} theme={this.props.theme}>
                        <img width="14px" src="/static/info.svg" alt="" />
                      </ModalExplanation>
                    </p>
                  )}
                </div>
              }
              subTitle={'APR'}
            />
          </div>
          <div className={cn(styles.title_item__container)}>
            <SoftTitleValue
              title={`$${formatZeroDecimals(Number(this.props.token.totalLockedRewards) || 0)}`}
              subTitle={'TVL'}
            />
          </div>
          {/* <div className={cn(styles.title_item__container)}>
              <SoftTitleValue
                title={`$${formatWithTwoDecimals(Number(this.props.token.balance))}`}
                subTitle={this.props.token.display_props.label}
              />
            </div>
            <div className={cn(styles.title_item__container)}>
              <SoftTitleValue title={formatWithTwoDecimals(this.props.token.rewards)} subTitle={this.props.callToAction} />
            </div> */}

          {/undefined/.test(multipliers[title]) ? (
            <div />
          ) : (
          <div className={cn(styles.title_item__container)}>
            <SoftTitleValue
              title={
                <div className="earn_center_ele">
                  {multipliers[title] + 'x'}
                  <p style={{ marginLeft: '5px', fontFamily: 'poppins', fontSize: '17px' }}>
                    <ModalMultiplierTip multiplier={multipliers[title]} theme={this.props.theme}>
                      <img width="14px" src="/static/info.svg" alt="" />
                    </ModalMultiplierTip>
                  </p>
                </div>
              }
              subTitle={'Multiplier'}
            />
          </div>
          )}

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
                <Icon name="warning circle" />A new version of this earn pool is live. Withdraw by
                 clicking the button below and then stake to the new pool to earn rewards!
              </h3>
            </div>
          ) : (
            <></>
          )}

          {isDeprecated ? (
            <div>
              <Segment basic>
            <Grid className={cn(styles.content2)}>
            <Grid.Column textAlign='center'>
              <h3 style={{ textAlign:'center', color: this.props.theme.currentTheme == 'dark' ? 'white' : '#1B1B1B' }}>
                Withdraw from the old pool!
              </h3>
              <WithdrawButton
                props={this.props}
                value={this.state.withdrawValue}
                changeValue={this.handleChangeWithdraw}
              />
              <Text
                size="medium"
                style={{
                  marginTop: '20px',
                  cursor: 'auto',
                  textAlign: 'center',
                  fontFamily: 'Poppins,Arial',
                  color: this.props.theme.currentTheme == 'dark' ? 'white' : '#1B1B1B',
                }}
              >
                * When you withdraw from the old pool contract, you will automagically claim any rewards!
              </Text>
          </Grid.Column>
          </Grid>
          </Segment>
          </div>) : (
          <>
            <div>
            <Segment basic>
            <Grid className={cn(styles.content2)} columns={2} relaxed="very" stackable>
            <Grid.Column>
            <DepositContainer
              title="Earn"
              value={this.state.depositValue}
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
                        <EarnButton
                          props={this.props}
                          value={this.state.depositValue}
                          changeValue={this.handleChangeDeposit}
                          togglePulse={this.togglePulse}
                          setPulseInterval={this.setPulseInterval}
                        />
                      </Grid.Column>
                    </Grid>
                  </>
                )
              }
              onChange={this.handleChangeDeposit}
              balance={this.props.token.balance}
              currency={this.props.token.lockedAsset}
              price={this.props.token.price}
              balanceText="Available"
              unlockPopupText="Staking balance and rewards require an additional viewing key."
              tokenAddress={this.props.token.lockedAssetAddress}
              userStore={this.props.userStore}
              theme={this.props.theme}
            />
        </Grid.Column>
        <Grid.Column>
          <DepositContainer
            title="Withdraw"
            value={this.state.withdrawValue}
            onChange={this.handleChangeWithdraw}
            action={
              <Grid columns={1} stackable relaxed={'very'}>
                <Grid.Column
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                  }}
                >
                  <WithdrawButton
                    props={this.props}
                    value={this.state.withdrawValue}
                    changeValue={this.handleChangeWithdraw}
                  />
                </Grid.Column>
              </Grid>
            } //({props: this.props, value: this.state.withdrawValue})}
            balance={this.props.token.deposit}
            currency={this.props.token.lockedAsset}
            price={this.props.token.price}
            balanceText="Staked"
            unlockPopupText="Staking balance and rewards require an additional viewing key."
            tokenAddress={this.props.token.rewardsContract}
            userStore={this.props.userStore}
            theme={this.props.theme}
          />
            </Grid.Column>
          </Grid>
            </Segment>
          </div>
          <ClaimBox
            balance={this.props.token.deposit}
            unlockPopupText="Staking balance and rewards require an additional viewing key."
            available={this.props.token.rewards}
            userStore={this.props.userStore}
            rewardsContract={this.props.token.rewardsContract}
            symbol={this.props.token.display_props.symbol}
            notify={this.props.notify}
            rewardsToken={this.props.token.rewardsSymbol || 'sSCRT'}
            deprecated={isDeprecated}
          />
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
            * Every time you deposit, withdraw or claim the contract will automagically claim your rewards for you!
          </Text>
          </>)}
        </Accordion.Content>
      </Accordion>
    );
  }
}

export default StandardEarnRow;
