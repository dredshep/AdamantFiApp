import React, { Component } from 'react';
import styles from './styles.styl';
import cn from 'classnames';
import { Accordion, Grid, Icon, Image, Segment } from 'semantic-ui-react';
import SoftTitleValue from '../SoftTitleValue';
import EarnButton from './StandardEarnRow/EarnButton';
import DepositContainer from './DepositContainer';
import ClaimBox from './StandardEarnRow/ClaimBox';
import { UserStoreEx } from '../../../stores/UserStore';
import { observer } from 'mobx-react';
import WithdrawButton from './StandardEarnRow/WithdrawButton';
import { divDecimals, formatWithTwoDecimals, zeroDecimalsFormatter, formatZeroDecimals } from '../../../utils';
import { Text } from '../../Base';
import stores from 'stores';
import Theme from 'themes';
import MigrateAssets from '../MigrateTokens';
import { ModalExplanation, ModalMultiplierTip } from '../APRModalExp';
import { InfoIcon } from 'components/Base/components/Icons/tsx_svg_icons';
import numeral from 'numeral';
import { infinityRewardTokenInfo } from 'services';


export const calculateAPY = (token: RewardsToken, price: number, priceUnderlying: number) => {
  // console.log(Math.round(Date.now() / 1000000))
  // deadline - current time, 6 seconds per block
  const timeRemaining = (Math.min(token.deadline, 7916452) - 427936) * 6.2 + 1634215386 - Math.round(Date.now() / 1000);

  // (token.deadline - Math.round(Date.now() / 1000000) );
  const pending = Number(divDecimals(token.remainingLockedRewards, token.rewardsDecimals)) * price;

  // this is already normalized
  const locked = Number(token.totalLockedRewards);

  //console.log(`pending - ${pending}; locked: ${locked}, time remaining: ${timeRemaining}`)
  const apr = Number((((pending * 100) / locked) * (3.154e7 / timeRemaining)).toFixed(0));
  const apy = Number((Math.pow(1 + apr / 100 / 365, 365) - 1) * 100);

  return apy;
};
export interface StatsAPR {
  roi: {
    d1: number;
    d7: number;
    d30: number;
    d365: number;
  };
  sefiP1000: {
    d1: number;
    d7: number;
    d30: number;
    d365: number;
  };
  usdP1000: {
    d1: number;
    d7: number;
    d30: number;
    d365: number;
  };
  apr: number;
  apy: number;
}
export const getAPRStats = (token: RewardsToken, price: number, isSefiInfinity?: boolean): StatsAPR => {

  // total sefi being distributed each day to lp providers in the form of rewards
  const totalDailySefi = 657534.25

  // using the mupltiplier for a given token, we find out the percentage of the total daily sefi
  // it particularly distributes
  const poolDailySefi = Number(multipliers[getTitle(token)]) * .0025 * totalDailySefi

  // dollar value of the liquidity pool
  const locked = Number(token.totalLockedRewards);

  // calculate the value of sefi to be distributed as rewards across a whole year
  // then find the annual percent return given the amount of assets locked to the pool
  let apr = (365 * poolDailySefi * price) / locked

  // infinity pool apr's use different calculation
  if (token.rewardsContract === globalThis.config.FETCHER_CONFIGS.infinityPoolContract?.pool_address) {

    const numStaked = infinityRewardTokenInfo[0].info.numStaked
    const sefiPrice = infinityRewardTokenInfo[0].info.price

    if (isSefiInfinity) {
      try {
        apr = (365 * 80547.95) / (numStaked / 1000000)
      } catch (err) {
        console.log(err);
        apr = 0
      }
    } else {
      try {
        if (globalThis.config.FETCHER_CONFIGS.showAlterAPR && globalThis.config['PRICE_DATA']["ALTER/USD"]) {
          apr = ((100000 * 2) * globalThis.config['PRICE_DATA']["ALTER/USD"].price) / ((numStaked / 1000000) * sefiPrice)
        } else {
          apr = 0;
        }
      } catch (err) {
        console.log(err);
        apr = 0
      }
    }
  }
  else if (token.name === 'ALTER') {
    if (globalThis.config.FETCHER_CONFIGS.showAlterAPR && globalThis.config['PRICE_DATA']["ALTER/USD"]) {
      apr = (((54000 * 4.0) * globalThis.config['PRICE_DATA']["ALTER/USD"].price) / ((Number(token.totalLockedRewards)) * globalThis.config['PRICE_DATA']["ALTER/USD"].price))
    } else {
      apr = 0;
    }
  }

  const apy = Number((Math.pow(1 + apr / 100 / 365, 365) - 1) * 100);
  const daysOfYear = 365;
  const roi = {
    d1: apr / daysOfYear,
    d7: Math.pow(1 + apr / daysOfYear, 7) - 1,
    d30: Math.pow(1 + apr / daysOfYear, 30) - 1,
    d365: Math.pow(1 + apr / daysOfYear, daysOfYear) - 1,
  };
  const sefiP1000 = {
    d1: (1000 * roi.d1) / price,
    d7: (1000 * roi.d7) / price,
    d30: (1000 * roi.d30) / price,
    d365: (1000 * roi.d365) / price,
  };
  const usdP1000 = {
    d1: sefiP1000.d1 * price,
    d7: sefiP1000.d7 * price,
    d30: sefiP1000.d30 * price,
    d365: sefiP1000.d365 * price,
  };
  const result: StatsAPR = {
    roi,
    sefiP1000,
    usdP1000,
    apy,
    apr,
  };
  return result;
};

export const unCapitalize = s => {
  if (typeof s !== 'string') {
    return '';
  }

  if(s === 'SEFI' || s === 'SHD' || s.charAt(0) !== 'S')
    return s; // Do not uncapitalize in this case

  return s.charAt(0).toLowerCase() + s.slice(1);
};

export const getTitle = (token) => {

  const _symbols = token.lockedAsset?.toUpperCase().split('-');

  let tokenName = unCapitalize(_symbols[1]) + ' - ' + unCapitalize(_symbols[2]);

  const isDeprecated = token.deprecated && token.deprecated_by !== '';

  let title = '';
  if (isDeprecated) {
    title = token.display_props.label === 'SEFI' ? 'SEFI STAKING (OLD)' : `${tokenName} (OLD)`;
  } else if (token.display_props.label === 'SEFI') {
    title = 'SEFI STAKING (V2)';
  } else if (token.display_props.label === 'ALTER') {
    title = 'ALTER STAKING';
  } else {
    title = tokenName;
  }

  return title
}

export const multipliers = {
  'SEFI STAKING (V2)': '0',
  'sUSDC - sUSDC(BSC)': '10',
  'sETH - sETH(BSC)': '6',
  'sSCRT - sUSDT': '28',
  'sSCRT - sETH': '41',
  'sSCRT - sWBTC': '41',
  'sSCRT - SEFI': '62',
  'sSCRT - SHD': '4',
  'SEFI - sXMR': '12',
  'SEFI - sUSDC': '24',
  'sETH - sWBTC': '0',
  'sSCRT - sBNB(BSC)': '12',
  'SEFI - sATOM': '8',
  'SEFI - sLUNA': '12',
  'SEFI - sOSMO': '4',
  'SEFI - sDVPN': '3',
  'sSCRT - sRUNE': '2',
  'sSCRT - ALTER': '9',
  'ALTER - sUSDC': '5'
};

export const tokenImages = {
  'AAVE': '/static/token-images/aave_ethereum.svg',
  'ADA(BSC)': '/static/token-images/ada_binance.svg',
  'ALPHA': '/static/token-images/alpha_ethereum.svg',
  'ALTER': '/static/tokens/alter.svg',
  'ATOM': '/static/atom.png',
  'BAC': '/static/token-images/bac_ethereum.svg',
  'BAKE(BSC)': '/static/token-images/bake_binance.svg',
  'BAND': '/static/token-images/band_ethereum.svg',
  'BAT': '/static/token-images/bat_ethereum.svg',
  'BCH(BSC)': '/static/token-images/bch_binance.svg',
  'BNB(BSC)': '/static/token-images/bnb_binance.svg',
  'BUNNY(BSC)': '/static/token-images/bunny_binance.svg',
  'BUSD(BSC)': '/static/token-images/busd_binance.svg',
  'CAKE(BSC)': '/static/token-images/cake_binance.svg',
  'COMP': '/static/token-images/comp_ethereum.svg',
  'DAI': '/static/token-images/dai_ethereum.svg',
  'DOGE(BSC)': '/static/token-images/doge_binance.svg',
  'DOT(BSC)': '/static/token-images/dot_binance.svg',
  'DPI': '/static/token-images/dpi_ethereum.svg',
  'DVPN': '/static/dvpn.png',
  'ENJ': '/static/token-images/enj_ethereum.svg',
  'ETH': '/static/token-images/eth_ethereum.svg',
  'ETH(BSC)': '/static/token-images/eth_binance.svg',
  'FINE(BSC)': '/static/token-images/fine_binance.svg',
  'KNC': '/static/token-images/knc_ethereum.svg',
  'LINA(BSC)': '/static/token-images/lina_binance.svg',
  'LINK': '/static/token-images/link_ethereum.svg',
  'LINK(BSC)': '/static/token-images/link_binance.svg',
  'LTC(BSC)': '/static/token-images/ltc_binance.svg',
  'LUNA': '/static/luna.png',
  'MANA': '/static/token-images/mana_ethereum.svg',
  'MKR': '/static/token-images/mkr_ethereum.svg',
  'OCEAN': '/static/token-images/ocean_ethereum.svg',
  'OSMO': '/static/osmo.png',
  'REN': '/static/token-images/ren_ethereum.svg',
  'RENBTC': '/static/token-images/renbtc_ethereum.svg',
  'RSR': '/static/token-images/rsr_ethereum.svg',
  'RUNE': '/static/token-images/rune_ethereum.svg',
  'SEFI': '/static/token-images/sefi.svg',
  'SHD': '/static/tokens/shade.svg',
  'SIENNA': '/static/token-images/sienna.svg',
  'SNX': '/static/token-images/snx_ethereum.svg',
  'SSCRT': '/static/token-images/sscrt.svg',
  'SUSHI': '/static/token-images/sushi_ethereum.svg',
  'TORN': '/static/token-images/torn_ethereum.svg',
  'TRX(BSC)': '/static/token-images/trx_binance.svg',
  'TUSD': '/static/token-images/tusd_ethereum.svg',
  'UNI': '/static/token-images/uni_ethereum.svg',
  'UNILP-WSCRT-ETH': '/static/token-images/unilp_ethereum.svg',
  'USDC': '/static/token-images/usdc_ethereum.svg',
  'USDC(BSC)': '/static/token-images/usdc_binance.svg',
  'USDT': '/static/token-images/usdt_ethereum.svg',
  'USDT(BSC)': '/static/token-images/usdt_binance.svg',
  'WBTC': '/static/token-images/wbtc_ethereum.svg',
  'XMR': '/static/sXMR.png',
  'XRP(BSC)': '/static/token-images/xrp_binance.svg',
  'XVS(BSC)': '/static/token-images/xvs_binance.svg',
  'YFI': '/static/token-images/yfi_ethereum.svg',
  'YFL': '/static/token-images/yfl_ethereum.svg',
  'ZRX': '/static/token-images/zrx_ethereum.svg'
};

export const apyString = (token: RewardsToken) => {
  const apy = Number(calculateAPY(token, Number(token.rewardsPrice), Number(token.price)));
  if (isNaN(apy) || 0 > apy) {
    return `∞%`;
  }
  const apyStr = zeroDecimalsFormatter.format(Number(apy));

  //Hotfix of big % number
  const apyWOCommas = apyStr.replace(/,/g, '');
  const MAX_LENGTH = 9;
  if (apyWOCommas.length > MAX_LENGTH) {
    const abrev = apyWOCommas?.substring(0, MAX_LENGTH);
    const abrevFormatted = zeroDecimalsFormatter.format(Number(abrev));
    const elevation = apyWOCommas.length - MAX_LENGTH;

    return `${abrevFormatted}e${elevation} %`;
  }
  return `${apyStr}%`;
};

export const aprString = (token: RewardsToken) => {
  const { apr } = getAPRStats(token, Number(token.rewardsPrice));
  return numeral(apr).format('0,0%');
};
export interface RewardsToken {
  name: string;
  decimals: string;
  display_props: {
    image: string;
    label: string;
    symbol: string;
  };
  price: string;
  rewardsPrice: string;
  balance: string;
  deposit: string;
  rewards: string;
  rewardsContract: string;
  rewardsDecimals: string;
  lockedAsset: string;
  lockedAssetAddress: string;
  totalLockedRewards: string;
  remainingLockedRewards: string;
  deadline: number;
  rewardsSymbol?: string;
  deprecated?: boolean;
  deprecated_by?: string;
  zero?: boolean;
}
