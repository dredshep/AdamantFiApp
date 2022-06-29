import React, { useCallback, useEffect, useState } from 'react';
import { Box } from 'grommet';
import { BaseContainer, PageContainer } from 'components';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import styles from '../EthBridge/styles.styl';
import StandardEarnRow, { unCapitalize } from '../../components/Earn/EarnRow/StandardEarnRow';
import InfinityEarnRow from '../../components/Earn/EarnRow/InfinityEarnRow';
import { multipliers, getTitle } from 'components/Earn/EarnRow';
import { rewardsDepositKey, rewardsKey } from '../../stores/UserStore';
import {
  displayHumanizedBalance,
  divDecimals,
  formatZeroDecimals,
  humanizeBalance,
  sleep,
  truncateAddressString,
  unlockToken,
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
import { Button, Icon } from 'semantic-ui-react'

const getAPRBeforeRender = (token) => {
  // another function that is similar to the apr function in the Earn component
  // this is different because it takes a different object in as a param
  // there is also the nuance of adding the infinity aprs for a total in order
  // to provide an accurate apr filter for the earn page
  // this will also likely be removed once the input data from the db is streamlined for v4

  // total sefi being distributed each day to lp providers in the form of rewards
  const totalDailySefi = 657534.25

  // using the mupltiplier for a given token, we find out the percentage of the total daily sefi
  // it particularly distributes
  const poolDailySefi = Number(multipliers[getTitleBeforeRender(token)]) * .0025 * totalDailySefi

  // dollar value of the liquidity pool
  const locked = Number(divDecimals(
                        Number(token.reward.total_locked) * Number(token.reward.inc_token.price),
                        token.reward.inc_token.decimals,
                      ));

  // calculate the value of sefi to be distributed as rewards across a whole year
  // then find the annual percent return given the amount of assets locked to the pool
  let apr = (365 * poolDailySefi * token.reward.rewards_token.price) / locked

  // infinity pool apr's use different calculation
  if (token.reward.pool_address === globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address) {

    const numStaked = infinityRewardTokenInfo[0].info.numStaked
    const sefiPrice = infinityRewardTokenInfo[0].info.price

    try {
      apr = (365 * 103561.64) / (numStaked / 1000000)
      if (globalThis.config.FETCHER_CONFIGS.showAlterAPR && globalThis.config['PRICE_DATA']["ALTER/USD"]) {
          apr += ((100000 * 2) * globalThis.config['PRICE_DATA']["ALTER/USD"].price) / ((numStaked / 1000000) * sefiPrice)
        }
    } catch (err) {
      console.log(err);
      apr = 0
    }
  }
  else if (token.token.name === 'ALTER') {
    if (globalThis.config.FETCHER_CONFIGS.showAlterAPR && globalThis.config['PRICE_DATA']['ALTER/USD']) {
      apr = ((14000 * 12) / (locked / globalThis.config['PRICE_DATA']['ALTER/USD'].price))
    } else {
      apr = 0;
    }
  }

  return apr;
}

const getTitleBeforeRender = (token) => {
  // helper function created to help filter by multiplier
  // very similar to code in Standard Earn Row render but different field names
  // since functionality is needed before data is converted in RewardToken objects
  // for v4 you can likely just remove this since the field names will be consistent
  // for reward token data

  const _symbols = token.reward.inc_token.symbol?.toUpperCase().split('-');
  let tokenName = unCapitalize(_symbols[1]) + ' - ' + unCapitalize(_symbols[2]);

  const isDeprecated = token.reward.deprecated && token.reward.deprecated_by !== '';
  let title = '';
  if (isDeprecated) {
    title = token.token.display_props.label === 'SEFI' ? 'SEFI STAKING (OLD)' : `${tokenName} (OLD)`;
  } else if (token.reward.pool_address === globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address) {
    title = 'INFINITY POOL';
  } else if (token.token.display_props.label === 'SEFI') {
    title = 'SEFI STAKING (V2)';
  } else if (token.token.display_props.label === 'ALTER') {
    title = 'ALTER STAKING';
  } else {
    title = tokenName;
  }

  return title;
}

interface RewardData {
  reward: IRewardPool;
  token: ITokenInfo;
}

const KEY_SHOW_OLD_POOLS = 'SHOW_OLD_POOLS';
const KEY_SHOW_FAVORITE_POOLS = 'SHOW_FAVORITE_POOLS';
const KEY_FAVORITE_POOLS = 'FAVORITE_POOLS';

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
  'LP-SSCRT-SHD',
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

const getLocalShowPools = (KEY_SHOW_POOLS: string): boolean => {
  const local_value = localStorage.getItem(KEY_SHOW_POOLS);

  if (local_value) {
    const res: boolean = local_value === 'true' ? true : false;
    return res;
  } else {
    return false;
  }
};
const setLocalShowPools = (value: boolean, value2: boolean) => {
  localStorage.setItem(KEY_SHOW_OLD_POOLS, value.toString());
  localStorage.setItem(KEY_SHOW_FAVORITE_POOLS, value2.toString());
}

const setLocalFavPools = (value: string[]) => {
  localStorage['FAVORITE_POOLS'] = JSON.stringify(value);
}

const getInfinityPoolNumStaked = async () => Number(globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.total_locked)

export const infinityOrder = {
  'SEFI': 0,
  'ALTER': 1,
}

function filterIterator() {
  let nextIndex = 0;
  const filters = ['noneFilter', 'descFilter', 'ascFilter']
  return {
    next: function() {
      nextIndex = (nextIndex + 1) % filters.length;
      return { value: filters[nextIndex], done: false };
    }
  }
}

let filterIter = filterIterator();


export const SeFiPage = observer(() => {

  const { user, tokens, rewards, userMetamask, theme } = useStores();

  const [searchText, setSearchText] = useState<string>('');
  const [aprFilter, setAprFilter] = useState<any>("noneFilter");
  const [liquidityFilter, setLiquidityFilter] = useState<any>("noneFilter");
  const [multiFilter, setMultiFilter] = useState<any>("noneFilter");
  const [filteredTokens, setFilteredTokens] = useState<ITokenInfo[]>([]);
  const [showFavoritePools, setShowFavoritePools] = useState<boolean>(getLocalShowPools(KEY_SHOW_FAVORITE_POOLS));
  const [showOldPools, setShowOldPools] = useState<boolean>(getLocalShowPools(KEY_SHOW_OLD_POOLS));
  const [favPools, setFavPools] = useState<string[]>(localStorage[KEY_FAVORITE_POOLS] ? JSON.parse(localStorage[KEY_FAVORITE_POOLS]) : []);
  // const [rewardTokens, setRewardTokens] = useState<RewardsToken[]>([]);

  useEffect(() => {
    setLocalShowPools(showOldPools, showFavoritePools);
    setLocalFavPools(favPools)
    //eslint-disable-next-line
  }, [showOldPools, showFavoritePools, favPools]);

  const [sefiBalanceErc, setSefiBalanceErc] = useState<string>(undefined);
  const [rewardsData, setRewardsData] = useState([]);
  const [aprData, setAprData] = useState({});

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

  useEffect(() => {
    const asyncWrapper = async () => {
      let dict = {};
      rewardsData.map((token) => {
        let x = getAPRBeforeRender(token);
        dict[token.reward.pool_address] = isNaN(x) ? 0 : x;
      })
      setAprData(dict)
    }
      asyncWrapper().then(() => { });
  }, [rewardsData]);

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
  }, []);

  return (
    <BaseContainer>
      <PageContainer>
        <Box
          direction="row"
          wrap={true}
          fill={true}
          justify="end"
          align="center"
          className={`${styles.poolToggles} ${theme.currentTheme}`}
        >
          <div>
            <h4 className={`${theme.currentTheme} poolToggle`}>Show favorite pools: </h4>
            <ToggleButton value={showFavoritePools} onClick={() => setShowFavoritePools(!showFavoritePools)} />
          </div>
          <div>
            <h4 className={`${theme.currentTheme} poolToggle`}>Show inactive pools: </h4>
            <ToggleButton value={showOldPools} onClick={() => setShowOldPools(!showOldPools)} />
          </div>
        </Box>
        <Box
          direction="row"
          wrap={true}
          fill={true}
          justify="end"
          align="center"
          className={`${styles.filterOptions} ${theme.currentTheme}`}
        >
          <input
            autoFocus
            className={`${styles.earnSearch} ${theme.currentTheme}`}
            placeholder="Search symbol"
            onChange={e => {
                setSearchText( e.target.value.trim().toLowerCase().replace(/\s+/g, '') )
              }
            }
          />
          <div className={`${styles.filterButtons} ${theme.currentTheme}`}>
              <Button className={`${styles[aprFilter]} ${styles[theme.currentTheme]}`} onClick={() => {
              if (liquidityFilter !== "noneFilter" || multiFilter !== "noneFilter")
                filterIter = filterIterator();
              setAprFilter(filterIter.next().value)
              setLiquidityFilter("noneFilter")
              setMultiFilter("noneFilter")
              }
            }>
              APR {aprFilter !== "noneFilter" && (aprFilter === "descFilter" ? <Icon name='arrow up'/> : <Icon name='arrow down'/>)}
            </Button>
            <Button className={`${styles[liquidityFilter]} ${styles[theme.currentTheme]}`} onClick={() => {
              if (aprFilter !== "noneFilter" || multiFilter !== "noneFilter")
                filterIter = filterIterator();
              setLiquidityFilter(filterIter.next().value)
              setAprFilter("noneFilter")
              setMultiFilter("noneFilter")
              }
            }>
              TVL {liquidityFilter !== "noneFilter" && (liquidityFilter === "descFilter" ? <Icon name='arrow up'/> : <Icon name='arrow down'/>)}
            </Button>
            <Button className={`${styles[multiFilter]} ${styles[theme.currentTheme]}`} onClick={() => {
              if (aprFilter !== "noneFilter" || liquidityFilter !== "noneFilter")
                filterIter = filterIterator();
              setMultiFilter(filterIter.next().value)
              setAprFilter("noneFilter")
              setLiquidityFilter("noneFilter")
              }
            }>
              Multiplier {multiFilter !== "noneFilter" && (multiFilter === "descFilter" ? <Icon name='arrow up'/> : <Icon name='arrow down'/>)}
            </Button>
          </div>
        </Box>
        <Box style={{ width: '100%' }} direction="row" wrap={true} fill={true} justify="center" align="start">

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
                  .filter(rewardToken => showOldPools ||
                    (!rewardToken.reward.deprecated && !rewardToken.reward.zero))
                  .filter(rewardToken => {
                      if (showFavoritePools)
                        return favPools.includes(rewardToken.reward.pool_address)
                      else
                        return true
                  })
                  .filter(rewardToken => {
                    if (searchText !== '') {
                      if (rewardToken.reward.pool_address === globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address) {
                        return ('infinity').includes(searchText) ||
                                ('sefi').includes(searchText) ||
                                ('alter').includes(searchText)
                      } else {
                        let symbols = rewardToken.reward.inc_token.symbol.toLowerCase().split('-')
                        if (symbols.length < 2) symbols[1] = ''
                        else symbols = symbols.slice(1,3)
                        return (symbols[0]+'-'+symbols[1]).includes(searchText) ||
                                (symbols[1]+'-'+symbols[0]).includes(searchText)
                      }
                    } else return true
                  })
                  .sort((a, b) => {
                    if (aprFilter !== "noneFilter") {
                      const aprA = aprData[a.reward.pool_address]
                      const aprB = aprData[b.reward.pool_address]

                      if (aprFilter === "descFilter")
                        return aprB - aprA;
                      else
                        return aprA - aprB;
                    } else
                      return 1;
                  })
                  .sort((a, b) => {
                    if (liquidityFilter !== "noneFilter") {
                      const tvlA = Number(a.reward.total_locked) * Number(a.reward.inc_token.price)
                      const tvlB = Number(b.reward.total_locked) * Number(b.reward.inc_token.price)

                      if (liquidityFilter === "descFilter")
                        return tvlB - tvlA;
                      else
                        return tvlA - tvlB;
                    } else
                      return 1;
                  })
                  .sort((a, b) => {
                    if (multiFilter !== "noneFilter") {
                      const titleA = getTitleBeforeRender(a)
                      const titleB = getTitleBeforeRender(b)
                      if (multipliers[titleA] === undefined) {
                        return 1;
                      }
                      if (multipliers[titleB] === undefined) {
                        return -1;
                      }
                      if (multiFilter === "descFilter")
                        return Number(multipliers[titleB]) - Number(multipliers[titleA]);
                      else
                        return Number(multipliers[titleA]) - Number(multipliers[titleB]);
                    } else
                      return 1;
                  })
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

                    // if (token.rewardsContract === 'secret1ny8nvnya5q4zcxpyldvdhts0uvh26heny8ynuj')
                    //   console.log(new Date(), 'sSCRT-sUSDT LP Token Price:', token.price, 'SEFI Price:', token.rewardsPrice)

                    if (token.rewardsContract === globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address) {
                      return <InfinityEarnRow
                        notify={notify}
                        key={`${rewardsData[0].reward.inc_token.symbol}-${0}`}
                        userStore={user}
                        token={token}
                        callToAction="Sefi Earnings"
                        favPools={favPools}
                        setFavPools={setFavPools}
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
                        favPools={favPools}
                        setFavPools={setFavPools}
                        theme={theme}
                      />
                    );
                  })}

              </>) : <Loader color="#cb9b51" />}
        </Box>
      </PageContainer>
    </BaseContainer>
  );
});
