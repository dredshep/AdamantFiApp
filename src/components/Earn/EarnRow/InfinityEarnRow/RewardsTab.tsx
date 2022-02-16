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
import { unlockJsx } from 'components/SefiModal/utils';
import ScrtTokenBalanceSingleLine from '../ScrtTokenBalanceSingleLine';
import React, { useEffect, useRef, useState } from 'react';

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

// preemptively switch RewardsTab component from class to functional
// the switch was necessary to easily handle multiple buttons all having
// the same functionality to update the same component state
// the specific action replicated was creating a viewing key
const RewardsTab = ({ notify, userStore, theme, token, createKey, vkey }) => {

  const [rewardTokens, setRewardTokens] = useState(undefined)
  const [changed, setChanged] = useState(false)
  const _isMounted = useRef(true);

  useEffect(() => {
    handleUpdate();
    return () => { // ComponentWillUnmount in Class Component
        _isMounted.current = false;
    }
  }, [])

  useEffect(() => {
    const asyncWrapper = async () => {
      const rewards = await getInfinityRewards()

      // await getInfinityRewards() can return either reward token data or a querry error
      // message as a valid json response. the query error can be triggered if you toggle
      // the rewards and details back and forth multiple times, only after creating the
      // infinity viewing key
      if (_isMounted.current) {
        if (rewards?.query_error)
          handleUpdate()
        else
          setRewardTokens(rewards)
      }
    }
    asyncWrapper().then(() => { });
  }, [token.rewards, vkey, changed])

  const handleUpdate = () => {
    setChanged(!changed)
  }

  const getInfinityRewards = async () => {

    try {

      if (vkey === undefined) {
        return undefined
      }

      const res = await userStore.secretjs.queryContractSmart(token.rewardsContract, {
        rewards: {
          address: userStore.address, // address of the user that wants to see his balance
          key: vkey, // viewing key of the user that wants to see his balance
          height: (await userStore.secretjs.getBlock()).header.height, // current block height so the reward calculations can be done
        },
      });

      return res

    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  return (
    <Container className={`${styles.containerStyle} ${styles[theme.currentTheme]}`}>
      <TabsHeader />
      <Grid verticalAlign='middle'>
        {vkey === undefined ? (
        <Grid.Row centered >
          <Grid.Column verticalAlign='middle' textAlign='center' className={`${styles.detail} ${styles.label} ${styles[theme.currentTheme]}`} style={{ width: '250px', margin: '20px 0px 0px 0px', 'fontSize': '16px' }}>
            {/* <strong>Can't view rewards without a viewing key</strong> */}
            <ScrtTokenBalanceSingleLine
                value={token.rewards}
                currency={token.lockedAsset}
                price={token.rewardsPrice}
                selected={false}
                balanceText={""}
                popupText={""}
                createKey={createKey}
                noun={"Rewards"}
              />
          </ Grid.Column>
        </Grid.Row>) :
          (<>{rewardTokens !== undefined ?
            <>
              {infinityRewardTokenInfo
                .map(tokenInfo => {
                  const reward = rewardTokens.rewards.tokens_rewards
                    .filter(infTokenReward => {
                      return infTokenReward.token_contract.address === tokenInfo.info.address
                    })

                  return <div key={tokenInfo.info.symbol} className={cn(styles.rewards)}>
                    <Image className={cn(styles.image)} src={tokenInfo.info.img} rounded size="mini" />
                    <div className={cn(styles.name)}>
                      <SoftTitleValue title={tokenInfo.info.symbol} subTitle="    " />
                    </div>
                    <div style={{overflow: 'hidden'}} className={`${styles.label} ${styles[theme.currentTheme]}`}>
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
                <div className={`${styles.label} ${styles[theme.currentTheme]}`}>
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
                    balance={token.balance}
                    unlockPopupText={""}
                    secretjs={userStore.secretjsSend}
                    contract={token.rewardsContract}
                    symbol={token.rewardsSymbol}
                    available={token.rewards}
                    notify={notify}
                    rewardsToken={token.rewardsSymbol}
                    rewardsContract={token.rewardsContract}
                    lockedAssetAddress={token.lockedAssetAddress}
                    handleUpdate={handleUpdate}>
                  </InfinityClaimButton>
                </Grid.Column>
              </Grid.Row>
            </>
            : <Grid.Row verticalAlign='middle' centered> <Loader className={cn(styles.loader)} /></Grid.Row>} </>)}
      </Grid>
    </Container>
  );
}

export default RewardsTab;