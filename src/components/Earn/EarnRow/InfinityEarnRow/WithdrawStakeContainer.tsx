import cn from 'classnames';
import styles from '../styles.styl';
import { Button, Grid, Icon, Input, Popup } from 'semantic-ui-react';
import React, { useEffect, useState } from 'react';
import WithdrawStakeButton from './WithdrawStakeButton';
import { getViewingKey } from '../../../../blockchain-bridge';
import { divDecimals, unlockToken } from '../../../../utils';
import moment from 'moment';
import { ModalInfinityCountdown, ModalInfinityViewingKey, ModalInfinityWithdraw } from './InfinityPoolModals';

const buttonStyle = {
  borderRadius: '15px',
  fontSize: '1rem',
  fontWeight: 500,
  height: '30px',
  marginRight: '12px',
  marginLeft: '12px',
  padding: '0.5rem 1rem 1rem 1rem',
  color: '#5F5F6B',
  backgroundColor: 'transparent',
};

export interface pendingLockup {
  to_redeem_amount: string;
  redeem_timestamp: number;
}

export interface balanceQuery {
  balance: {
    amount: string;
    pending_lockup_redeems: pendingLockup[];
  }
}

const WithdrawStakeContainer = ({ props, value, onUpdate, updateWithdrawStake, currency, balanceText, unlockPopupText, tokenAddress, userStore, theme, token }) => {

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [balance, setBalance] = useState(undefined)
  const [vkey, setVkey] = useState(undefined)
  const [expiringCount, setExpiringCount] = useState(0)

  useEffect(() => {
    const asyncWrapper = async () => {
      const res = await getBalance()

      if (res !== undefined) {
        setBalance(res.balance)
      }
    }
    asyncWrapper().then(() => { });
  }, [, updateWithdrawStake, token.deposit])

  useEffect(() => {
    const amount = getWithdrawAmount()
    setWithdrawAmount(divDecimals(amount, props.token.decimals))
  }, [balance])

  useEffect(() => {
    const interval = setInterval(() => {
      if (balance !== undefined) {
        const amount = getWithdrawAmount()
        setWithdrawAmount(divDecimals(amount, props.token.decimals))
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [, expiringCount, withdrawAmount]);

  const getBalance = async () => {

    try {

      const viewingKey = await getViewingKey({
        keplr: props.userStore.keplrWallet,
        chainId: props.userStore.chainId,
        address: globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address,
      });

      setVkey(viewingKey)

      if (viewingKey === undefined) {
        return undefined
      }

      const res = await props.userStore.secretjs.queryContractSmart(globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address, {
        balance: {
          address: props.userStore.address, // address of the user that wants to see his balance
          key: viewingKey, // viewing key of the user that wants to see his balance
        },
      }) as balanceQuery;

      return res

    } catch (e) {
      console.error(e)
      return undefined;
    }
  }

  const getWithdrawAmount = () => {
    const now = Math.round(Date.now() / 1000)

    let pendingRedeems = 0;
    let count = 0

    if (balance !== undefined) {
      for (const lockup of balance.pending_lockup_redeems) {
        if (now > lockup.redeem_timestamp) {
          pendingRedeems += Number(lockup.to_redeem_amount)
        }
        if (now < lockup.redeem_timestamp)
          count ++
      }
    }
    setExpiringCount(count)

    return pendingRedeems;
  }

  return (
    <div className={`${styles.changeBalance} ${styles[props.theme.currentTheme]}`}>
      <div className={cn(styles.deposit_content)}>
        <div className={cn(styles.balanceRow)}>
          <div className={cn(styles.title)}>{balanceText}</div>
        </div>
        <div>
          {<Grid className={cn(styles.withdrawStake)} verticalAlign='middle' floated='right'>
            <Grid.Column className={cn(styles.inputRow)}>
              {vkey === undefined
              ? <div className={`${styles.claim_label} ${styles[theme.currentTheme]} ${styles.vkey} ${styles.withdrawAmount}`}>
                <strong>Create viewing key</strong>
                <ModalInfinityViewingKey theme={theme}>
                  <img width="14px" src="/static/info.svg" alt="" />
                </ModalInfinityViewingKey></div> :
              (<div style={{float: 'left'}} className={`${styles.claim_label} ${styles[theme.currentTheme]} ${styles.withdrawAmount}`}>
                {withdrawAmount === '' ?
                  <strong>0</strong> :
                  <strong>{`${withdrawAmount}`}</strong>
                }
                <span style={{ marginLeft: '10px' }}>{currency}</span>
              </div>)}
              <ModalInfinityWithdraw theme={theme}>
                <img width="14px" src="/static/info.svg" alt="" style={{ paddingTop: '16px' }}/>
              </ModalInfinityWithdraw>
              <WithdrawStakeButton
                      props={props}
                      value={withdrawAmount}
                      onUpdate={onUpdate}
                    />
              </Grid.Column>
              </Grid>}
        </div>
        <div>
          {<Grid columns={1}>
            <Grid.Row verticalAlign='top'>
              {expiringCount > 0 ?
              <><Grid.Column width={6} textAlign='left' >
                <div className={`${styles.pendingRedeem} ${styles[props.theme.currentTheme]}`}>
                  <ModalInfinityCountdown theme={theme}>
                        <img width="14px" style={{marginRight:'4px'}} src="/static/info.svg" alt="" />
                  </ModalInfinityCountdown>
                  <span>Unlock countdown</span>
                </div>
              </Grid.Column>
              <Grid.Column width={3} textAlign='left' style={{marginLeft: '-25px'}}>
                {balance !== undefined &&
                <ul style={{listStyleType:'none', padding:'0', margin:'0'}}>
                  {balance.pending_lockup_redeems
                        .filter(lockup => {
                          return Date.now() < lockup.redeem_timestamp*1000
                        })
                        .map((lockup, index) => {
                          if (index < 3)
                            return <li key={lockup.redeem_timestamp}>{`${divDecimals(lockup.to_redeem_amount, 6)} SEFI`}</li>
                          else
                            return <></>
                        })}
                </ul>}
              </Grid.Column>
                  <Grid.Column width={6} textAlign='left' verticalAlign='top' style={{ marginLeft: '-25px' }}>
                    {balance !== undefined &&
                      <ul className={`${styles.pendingWithdraw} ${styles[props.theme.currentTheme]}`} style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
                        {balance.pending_lockup_redeems
                          .filter(lockup => {
                            return Date.now() < lockup.redeem_timestamp * 1000
                          })
                          .map((lockup, index) => {
                            const timeRemaining = moment.duration(lockup.redeem_timestamp * 1000 - Date.now() + 60000)

                            if (index < 3)
                              return <li key={lockup.redeem_timestamp}>{timeRemaining.days()}<span>d</span> {timeRemaining.hours()}<span>h</span> {timeRemaining.minutes()}<span>m</span></li>
                            else
                              return <></>
                          })}
                      </ul>}
                  </Grid.Column></>
                : <Grid.Column>
                  Tokens in the unlock period will list here
                </Grid.Column>}
            </Grid.Row>
          </Grid>}
        </div>
      </div>
    </div>
  );
};

export default WithdrawStakeContainer;