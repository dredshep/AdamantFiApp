import React, { useCallback, useEffect, useState } from 'react';
import { Box } from 'grommet';
import { BaseContainer, PageContainer } from 'components';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import styles from '../EthBridge/styles.styl';
import StandardEarnRow from '../../components/Earn/EarnRow/StandardEarnRow';
import InfinityEarnRow from '../../components/Earn/EarnRow/InfinityEarnRow';
import { rewardsDepositKey, rewardsKey } from '../../stores/UserStore';
import {
  displayHumanizedBalance,
  divDecimals,
  formatZeroDecimals,
  humanizeBalance,
  sleep,
  truncateAddressString,
} from '../../utils';
import { IRewardPool, ITokenInfo } from '../../stores/interfaces';
import Loader from 'react-loader-spinner';
import { Text } from 'components/Base';
import thisStyles from './styles.styl';
import cn from 'classnames';
import { ethMethodsSefi, web3 } from '../../blockchain-bridge/eth';
import BigNumber from 'bignumber.js';
import { notify } from '../../blockchain-bridge/scrt/utils';
import ToggleButton from '../../components/Earn/ToggleButton';
import { infinityRewardTokenInfo } from 'services';

const Web3 = require('web3');

const sefiAddr = '0x773258b03c730f84af10dfcb1bfaa7487558b8ac';
const abi = {
  constant: true,
  inputs: [],
  name: 'totalSupply',
  outputs: [
    {
      name: '',
      type: 'uint256',
    },
  ],
  type: 'function',
};

// // Get ERC20 Token contract instance
// let contract = new web3.eth.Contract(abi).at(sefiAddr);

// // Call function
// contract.totalSupply((error, totalSupply) => {
//   console.log("Total Supply: " + totalSupply.toString());
// });
function SefiBalance(props: { address: string; sefiBalance: string | JSX.Element; isEth?: boolean }) {
  const src_img = props.isEth ? '/static/eth.png' : '/static/scrt.svg';

  return (
    <div className={cn(thisStyles.balanceContainer)}>
      <img className={styles.imgToken} style={{ height: 18 }} src={src_img} alt={'scrt'} />
      <button className={cn(thisStyles.balanceButton)}>
        <Text>{truncateAddressString(props.address, 10)}</Text>
      </button>
      <div className={cn(thisStyles.balanceAmount)}>
        {props.sefiBalance ? (
          <Text>
            {props.sefiBalance} {'SEFI'}
          </Text>
        ) : (
          <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
        )}
      </div>
    </div>
  );
}

interface RewardData {
  reward: IRewardPool;
  token: ITokenInfo;
}

const KEY_SHOW_OLD_POOLS = 'SHOW_OLD_POOLS';

const order = [
  'SEFI',
  'ALTER',
  'LP-SUSDC-SUSDC(BSC)',
  'LP-SETH-SETH(BSC)',
  'LP-SSCRT-SUSDT',
  'LP-SSCRT-SETH',
  'LP-SSCRT-SWBTC',
  'LP-SSCRT-SEFI',
  'LP-SSCRT-ALTER',
  'LP-ALTER-SUSDC',
  'LP-SEFI-SXMR',
  'LP-SEFI-SUSDC',
  'LP-SETH-SWBTC',
  'LP-SSCRT-SBNB(BSC)',
  'LP-SEFI-SATOM',
  'LP-SEFI-SLUNA',
  'LP-SEFI-SOSMO',
  'LP-SEFI-SDVPN',
  'LP-SSCRT-SRUNE',
  'LP-SSCRT-SLINK',
  'LP-SSCRT-SDOT(BSC)',
  'LP-SSCRT-SDAI',
  'LP-SSCRT-SMANA',
  'LP-SSCRT-SOCEAN',
  'LP-SSCRT-SRSR',
  'LP-SSCRT-SUNI',
  'LP-SSCRT-SYFI'
];

const getLocalShowPools = (): boolean => {
  const local_value = localStorage.getItem(KEY_SHOW_OLD_POOLS);

  if (local_value) {
    const res: boolean = local_value === 'true' ? true : false;
    return res;
  } else {
    return true;
  }
};
const setLocalShowPools = (value: boolean) => localStorage.setItem(KEY_SHOW_OLD_POOLS, value.toString());

const getInfinityPoolNumStaked = async () => Number(globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.total_locked)

export const infinityOrder = {
  'SEFI': 0,
  'ALTER': 1,
}

export const SeFiPage = observer(() => {
  const { user, tokens, rewards, userMetamask, theme } = useStores();

  const [filteredTokens, setFilteredTokens] = useState<ITokenInfo[]>([]);
  const [showOldPools, setShowOldPools] = useState<boolean>(getLocalShowPools());
  // const [rewardTokens, setRewardTokens] = useState<RewardsToken[]>([]);

  useEffect(() => {
    setLocalShowPools(showOldPools);
    //eslint-disable-next-line
  }, [showOldPools]);

  async function addSefiToWatchlist() {
    try {
      // wasAdded is a boolean. Like any RPC method, an error may be thrown.
      const wasAdded = await web3.currentProvider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Initially only supports ERC20, but eventually more!
          options: {
            address: globalThis.config.ETH_GOV_TOKEN_ADDRESS, // The address that the token is at.
            symbol: 'SEFI', // A ticker symbol or shorthand, up to 5 chars.
            decimals: 6, // The number of decimals in the token
            image: 'https://pbs.twimg.com/profile_images/1361712479546474498/1a3370iV_400x400.jpg', // A string url of the token logo
          },
        },
      });

      if (wasAdded) {
        notify('success', 'SeFi in on your watchlist on Metamask');
      }
    } catch (error) {
      notify('error', `Failed to add SeFi to the watchlist on Metamask: ${error}`);
      console.log(`Failed to add SeFi to the watchlist on Metamask: ${error}`);
    }
  }

  const [sefiBalanceErc, setSefiBalanceErc] = useState<string>(undefined);
  const [rewardsData, setRewardsData] = useState([]);

  useEffect(() => {
    const asyncWrapper = async () => {
      while (rewards.isPending) {
        await sleep(100);
      }

      const mappedRewards = rewards.allData
        .filter(rewards => filteredTokens.find(element => element.dst_address === rewards.inc_token.address))
        .map(reward => {
          return { reward, token: filteredTokens.find(element => element.dst_address === reward.inc_token.address) };
        });

      setRewardsData(mappedRewards);

      try {

        infinityRewardTokenInfo[infinityOrder['SEFI']].info.price = globalThis.config['PRICE_DATA']["SEFI/USDT"] ? globalThis.config['PRICE_DATA']["SEFI/USDT"].price : "0.04";

        infinityRewardTokenInfo[infinityOrder['SEFI']].info.numStaked = await getInfinityPoolNumStaked()
      } catch (err) {
        console.log(err);
      }

    };
    asyncWrapper().then(() => { });
  }, [filteredTokens, rewards, rewards.data]);

  const testSetTokens = useCallback(() => {
    const asyncWrapper = async () => {
      if (tokens.allData.length > 0) {
        await sleep(500);
        setFilteredTokens(tokens.tokensUsageSync('LPSTAKING'));
      }
    };
    asyncWrapper();
    //eslint-disable-next-line
  }, [tokens, tokens.allData]);

  useEffect(() => {
    testSetTokens();
  }, [testSetTokens]);

  useEffect(() => {
    (async () => {
      if (userMetamask.ethAddress) {
        const balanceResult = await ethMethodsSefi.checkGovBalance(userMetamask.ethAddress);

        const asBigNumber = new BigNumber(balanceResult);
        if (asBigNumber.isNaN()) {
          setSefiBalanceErc(balanceResult);
        } else {
          setSefiBalanceErc(displayHumanizedBalance(humanizeBalance(asBigNumber, 6), null, 6));
        }
      }
    })();
  }, [userMetamask, userMetamask.ethAddress]);

  useEffect(() => {
    rewards.init({
      isLocal: true,
      sorter: 'none',
      pollingInterval: 20000,
    });
    rewards.fetch();
    tokens.init();
    //eslint-disable-next-line
    // console.log(rewards);
    // console.log(tokens);
  }, []);

  return (
    <BaseContainer>
      <PageContainer>
        <Box
          style={{ width: '100%', paddingInline: '22%' }}
          direction="row"
          wrap={true}
          fill={true}
          justify="end"
          align="center"
        >
          <h4 className={`${theme.currentTheme} old_pools`}>Show inactive pools: </h4>
          <ToggleButton value={showOldPools} onClick={() => setShowOldPools(!showOldPools)} />
        </Box>
        <Box style={{ width: '100%' }} direction="row" wrap={true} fill={true} justify="center" align="start">
          <Box direction="column" align="center" justify="center" className={styles.base}>

            {rewardsData.length > 0 ?
              (<>
                {rewardsData
                  .slice()
                  .sort((a, b) => {
                    const testA = a.reward.inc_token.symbol.toUpperCase();
                    const testB = b.reward.inc_token.symbol.toUpperCase();
                    if (order.indexOf(testA) === -1) {
                      return 1;
                    }
                    if (order.indexOf(testB) === -1) {
                      return -1;
                    }
                    return order.indexOf(testA) - order.indexOf(testB);
                  })
                  .filter(rewardToken => globalThis.config.TEST_COINS || !rewardToken.reward.hidden)
                  .filter(a => showOldPools || (!a.reward.deprecated && !a.reward.zero))
                  .map((rewardToken, i) => {

                    const token = {
                      rewardsContract: rewardToken.reward.pool_address,
                      lockedAsset: rewardToken.reward.inc_token.symbol,
                      lockedAssetAddress: rewardToken.token.dst_address,
                      totalLockedRewards: divDecimals(
                        Number(rewardToken.reward.total_locked) * Number(rewardToken.reward.inc_token.price),
                        rewardToken.reward.inc_token.decimals,
                      ),
                      rewardsDecimals: String(rewardToken.reward.rewards_token.decimals),
                      rewards: user.balanceRewards[rewardsKey(rewardToken.reward.pool_address)],
                      deposit: user.balanceRewards[rewardsDepositKey(rewardToken.reward.pool_address)],
                      balance: user.balanceToken[rewardToken.token.dst_address],
                      decimals: rewardToken.token.decimals,
                      name: rewardToken.token.name,
                      price: rewardToken.reward.inc_token.symbol === "SEFI" ? String(infinityRewardTokenInfo[infinityOrder['SEFI']].info.price) : String(rewardToken.reward.inc_token.price),
                      rewardsPrice: rewardToken.reward.rewards_token.symbol === "SEFI" ? String(infinityRewardTokenInfo[infinityOrder['SEFI']].info.price) : String(rewardToken.reward.rewards_token.price),
                      display_props: rewardToken.token.display_props,
                      remainingLockedRewards: rewardToken.reward.pending_rewards,
                      deadline: Number(rewardToken.reward.deadline),
                      rewardsSymbol: rewardToken.reward.rewards_token.symbol,
                      deprecated: rewardToken.reward.deprecated,
                      deprecated_by: rewardToken.reward.deprecated_by,
                      zero: rewardToken.reward.zero
                    };

                    if (token.rewardsContract === globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address) {
                      return <InfinityEarnRow
                        notify={notify}
                        key={`${rewardsData[0].reward.inc_token.symbol}-${0}`}
                        userStore={user}
                        token={token}
                        callToAction="Sefi Earnings"
                        theme={theme}
                      />
                    }

                    return (
                      <StandardEarnRow
                        notify={notify}
                        key={`${token.lockedAsset}-${i}`}
                        userStore={user}
                        token={token}
                        callToAction="Sefi Earnings"
                        theme={theme}
                      />
                    );
                  })}

              </>) : <Loader />}
          </Box>
        </Box>
      </PageContainer>
    </BaseContainer>
  );
});
