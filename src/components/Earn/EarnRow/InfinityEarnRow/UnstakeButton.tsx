import React, { useState } from 'react';
import { valueToDecimals } from '../../../../utils';
import styles from '../styles.styl';
import { Button } from 'semantic-ui-react';
import { unlockToken } from '../../../../utils';
import { useStores } from 'stores';
import { getGasFeeInfinityPool } from '../gasFunctions';
import errNotify from 'utils/errNotify';

// todo: add failed toast or something
const UnstakeButton = ({ props, token, value, changeValue, onUpdate, togglePulse, setPulseInterval }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const amount = valueToDecimals(value, token.decimals);
  const { theme, user } = useStores();

  const unstakeSefiToInfinity = async () => {
    try {
      const res = await user.secretjsSend.asyncExecute(globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address, {
        redeem_lockup: {
          amount: amount,
        },
      },
        undefined,
        undefined,
        getGasFeeInfinityPool("redeem_lockup", user.numOfActiveProposals)
      );
      if (res.logs) { // TODO: change this to a more reliable way of checking for errors...
        changeValue({
          target: {
            value: '0.0',
          },
        });
        props.userStore.updateScrtBalance();
        props.notify('success', `Unstaked ${value} ${props.token.display_props.symbol} from the infinity pool contract`);
        onUpdate()
      } else {
        throw Error(res.raw_log)
      }
    } catch (e) {
      errNotify("Failed to unstake: ", e.message, props.notify)
    }
  }

  return (
    <Button
      loading={loading}
      className={`${styles.button} ${styles[theme.currentTheme]}`}
      disabled={Number(value) <= 0 || isNaN(value)}
      onClick={async () => {
        setLoading(true);
        await unstakeSefiToInfinity()
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
      Unstake
    </Button>
  );
};

export default UnstakeButton;