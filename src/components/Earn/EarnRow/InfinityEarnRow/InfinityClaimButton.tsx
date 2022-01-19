import { Redeem } from '../../../../blockchain-bridge/scrt';
import React, { useState } from 'react';
import styles from '../styles.styl';
import { Button, Icon, Popup } from 'semantic-ui-react';
import { useStores } from 'stores';
import { AsyncSender } from '../../../../blockchain-bridge/scrt/asyncSender';
import { unlockToken } from 'utils';
import { unlockJsx } from 'pages/Swap/utils';
import { formatSignificantFigures } from '../../../../utils';
import Loader from 'react-loader-spinner';
import { getGasFeeInfinityPool } from '../gasFunctions';
import errNotify from 'utils/errNotify';

const InfinityClaimButton = (props: {
  children: any;
  secretjs: AsyncSender;
  balance: string;
  unlockPopupText: string;
  rewardsContract: string;
  lockedAssetAddress: string;
  contract: string;
  available: string;
  symbol: string;
  notify: Function;
  rewardsToken?: string;
  handleUpdate: Function;
}) => {
  const { user, theme } = useStores();
  const [loading, setLoading] = useState<boolean>(false);

  const claimInfinityRewards = async () => {
    try {
      const res = await user.secretjsSend.asyncExecute(globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address, {
        redeem_lockup: {
          amount: "0",
        },
      },
        undefined,
        undefined,
        getGasFeeInfinityPool("redeem_lockup", user.numOfActiveProposals)
      )
      if (res.logs) { // TODO: change this to a more reliable way of checking for errors...
        user.updateScrtBalance();
        props.notify('success', `Claimed rewards from the infinity pool contract`);
        props.handleUpdate()
      } else {
        throw Error(res.raw_log)
      }
    } catch (e) {
      errNotify("Failed to claim: ", e.message, props.notify)
    }
  }

  const displayAvailable = () => {
    if (props.available === unlockToken) {
      return (
        <div className={`${styles.create_viewingkey} ${styles[theme.currentTheme]}`}>
          {unlockJsx({
            onClick: async () => {
              await user.keplrWallet.suggestToken(user.chainId, props.contract);
              // TODO trigger balance refresh if this was an "advanced set" that didn't
              // result in an on-chain transaction
              await user.updateBalanceForSymbol(props.symbol);
              await user.updateScrtBalance();
            },
          })}
          {props.balance?.includes(unlockToken) && (
            <Popup
              content={props.unlockPopupText}
              className={styles.iconinfo__popup}
              trigger={<Icon className={styles.icon_info} name="info" circular size="tiny" />}
            />
          )}
        </div>
      );
    } else {
      return props.available ? (
        <strong>{formatSignificantFigures(props.available, 6)}</strong>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loader type="ThreeDots" color="#ff726e" height="0.2em" />
        </div>
      );
    }
  };

  return (
    <>
      <Button
        loading={loading}
        className={`${styles.button} ${styles[theme.currentTheme]}`}
        disabled={typeof props.available === 'undefined' || props.available === '0'}
        onClick={async () => {
          setLoading(true);
          await claimInfinityRewards()
          await Promise.all([
            user.refreshTokenBalanceByAddress(props.rewardsContract),
            user.refreshRewardsBalances('', props.rewardsContract),
            user.refreshTokenBalanceByAddress(props.lockedAssetAddress),
            user.refreshRewardsBalances('', props.lockedAssetAddress),
          ]).catch(() => setLoading(false));
          setLoading(false);
        }}
      >
        Claim
      </Button>
    </>
  );
};

export default InfinityClaimButton;