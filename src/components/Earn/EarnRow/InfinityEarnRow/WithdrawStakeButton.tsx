import React, { useState } from 'react';
import { valueToDecimals } from '../../../../utils';
import styles from '../styles.styl';
import { Button } from 'semantic-ui-react';
import { useStores } from 'stores';
import { getGasFeeInfinityPool } from '../gasFunctions';

const WithdrawStakeButton = ({ props, value, onUpdate }) => {

  const [loading, setLoading] = useState<boolean>(false);
  const amount = valueToDecimals(value, props.token.decimals);
  const { theme, user } = useStores();

  const withdrawSefiFromInfinity = async () => {

    await user.secretjsSend.asyncExecute(globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address, {
      redeem: {},
    },
      undefined,
      undefined,
      getGasFeeInfinityPool("redeem", user.numOfActiveProposals)
    )
  }

  return (
    <Button
      loading={loading}
      className={`${styles.button} ${styles[theme.currentTheme]}`}
      style={{float: 'right'}}
      disabled={Number(value) === 0 || isNaN(value)}
      onClick={async () => {
        setLoading(true);
        await withdrawSefiFromInfinity()
          .then(_ => {
            // changeValue({
            //   target: {
            //     value: '0.0',
            //   },
            // });
            props.userStore.updateScrtBalance();
            props.notify('success', `Withdrew ${value} s${props.token.display_props.symbol} from the infinity pool contract`);
            onUpdate()
          })
          .catch(reason => {
            props.notify('error', `Failed to withdraw: ${reason}`);
            console.log(`Failed to withdraw: ${reason}`);
          });
        //TODO FIX THIS
        await Promise.all([
          props.userStore.refreshTokenBalanceByAddress(props.token.rewardsContract),
          props.userStore.refreshRewardsBalances('', props.token.rewardsContract),
          props.userStore.refreshTokenBalanceByAddress(props.token.lockedAssetAddress),
          props.userStore.refreshRewardsBalances('', props.token.lockedAssetAddress),
        ]).catch(() => setLoading(false));
        setLoading(false);
      }}
    >
      Withdraw
    </Button>
  );
};

export default WithdrawStakeButton;
