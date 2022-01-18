import { ITokenInfo, TOKEN_USAGE } from './interfaces';
import { IStores } from './index';
import * as services from 'services';
import { ListStoreConstructor } from './core/ListStoreConstructor';
import { computed } from 'mobx';
import { sleep } from '../blockchain-bridge/utils';
import { networkFromToken, NETWORKS } from '../blockchain-bridge';
import BigNumber from 'bignumber.js';

export class Tokens extends ListStoreConstructor<ITokenInfo> {
  constructor(stores: IStores) {
    super(stores, () => services.getTokensInfo({ page: 0, size: 1000 }), {
      pollingInterval: 30000,
      isLocal: true,
      paginationData: { pageSize: 100 },
      sorter: 'totalLockedUSD, asc',
      //sorter: 'none',
      //sorters: {}
      sorters: {
        totalLockedUSD: 'asc',
      },
    });
  }

  getTokenBySymbol(symbol: string): ITokenInfo {
    return this.allData.find(token => token.display_props.symbol.toLowerCase() === symbol.toLowerCase());
  }

  getTokenByDstAddress(dst_address: string): ITokenInfo {
    return this.allData.find(token => token.dst_address === dst_address);
  }

  getPriceByDstAddress(dst_address: string): BigNumber {
    if(dst_address === 'uscrt') // If the token is the native SCRT, get the price for sSCRT
      dst_address = 'secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek'

    let token = this.allData.find(token => token.dst_address === dst_address);

    return new BigNumber(token?.price);
  }

  //
  @computed get totalLockedUSD() {
    return this.allData.reduce((acc, v) => acc + Number(v.totalLockedUSD), 0);
  }

  tokensUsageSync(usage: TOKEN_USAGE, network?: NETWORKS) {
    return this.allData.filter(token => {
      //      console.log(token.display_props.usage.includes(usage))
      if (network) {
        return networkFromToken(token) === network && token.display_props.usage.includes(usage);
      } else {
        return token.display_props.usage.includes(usage);
      }
    });
  }

  async tokensUsage(usage: TOKEN_USAGE, network?: NETWORKS) {
    while (this.isPending) {
      await sleep(100);
    }

    return this.allData.filter(token => {
      //      console.log(token.display_props.usage.includes(usage))
      if (network) {
        return networkFromToken(token) === network && token.display_props.usage.includes(usage);
      } else {
        return token.display_props.usage.includes(usage);
      }
    });
  }
}
