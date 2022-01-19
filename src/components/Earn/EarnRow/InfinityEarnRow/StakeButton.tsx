import { DepositRewards, getFeeForExecute, Snip20Send } from '../../../../blockchain-bridge/scrt';
import React, { useState } from 'react';
import { valueToDecimals } from '../../../../utils';
import styles from '../styles.styl';
import { Button } from 'semantic-ui-react';
import { unlockToken } from '../../../../utils';
import { useStores } from 'stores';
import { getGasFeeInfinityPool } from '../gasFunctions';
import errNotify from 'utils/errNotify';

// todo: add failed toast or something
const StakeButton = ({ props, token, value, changeValue, togglePulse, setPulseInterval }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const amount = valueToDecimals(value, token.decimals);
  const { theme, user } = useStores();

  const depositInfinity = async () => {
    try {
      const res = await Snip20Send({
        msg: 'eyJkZXBvc2l0Ijp7fX0K', // '{"deposit":{}}' -> base64
        secretjs: props.userStore.secretjsSend,
        recipient: globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address,
        address: props.token.lockedAssetAddress,
        amount: amount,
        fee: getGasFeeInfinityPool("deposit", user.numOfActiveProposals),
      });

      if (res.logs) { // TODO: change this to a more reliable way of checking for errors...
        changeValue({
          target: {
            value: '0.0',
          },
        });
        props.userStore.updateScrtBalance();
        props.notify('success', `Staked ${value} ${props.token.display_props.symbol} to the infinity pool contract`);
      } else {
        //@ts-ignore
        throw Error(res.raw_log)
      }
    } catch (e) {
      errNotify("Failed to stake: ", e.message, props.notify)
    }
  }

  return (
    <Button
      loading={loading}
      className={`${styles.button} ${styles[theme.currentTheme]}`}
      disabled={Number(value) <= 0 || isNaN(value)}
      onClick={async () => {
        setLoading(true);
        await depositInfinity();
        ///TODO:FIX THIS
        await Promise.all([
          props.userStore.refreshTokenBalanceByAddress(props.token.rewardsContract),
          props.userStore.refreshRewardsBalances('', props.token.rewardsContract),
          props.userStore.refreshTokenBalanceByAddress(props.token.lockedAssetAddress),
          props.userStore.refreshRewardsBalances('', props.token.lockedAssetAddress),
        ]);
        setLoading(false);
      }}
    >
      Stake
    </Button>
  );
};

export default StakeButton;