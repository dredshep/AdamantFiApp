import { StdFee } from "secretjs/types/types";
import { PROPOSAL_BASE_FEE } from '../../../utils/gasPrices';
import { toUscrtFee } from 'utils';

export function getGasFee(GAS_CONSTANT, rewardsContract, activeProposals): StdFee {
  let coinType;

  if (rewardsContract === globalThis.config.SEFI_STAKING_CONTRACT) { //if this is the SEFI contract
    coinType = 'SEFI';
  } else if (rewardsContract === globalThis.config.FETCHER_CONFIGS.alterStakingContract?.pool_address) {
    coinType = 'ALTER';
    activeProposals = 0;
  } else {
    coinType = 'OTHER';
    activeProposals = 0;
  }

  const gas = GAS_CONSTANT[coinType] + PROPOSAL_BASE_FEE * activeProposals;

  return {
    amount: [{ amount: toUscrtFee(gas), denom: 'uscrt' }],
    gas: gas.toString(),
  };
};

export function getGasFeeInfinityPool(action, activeProposals): StdFee {
  let rsAmount = 2; // TODO: Put this dynamic
  let gas = 230_000;

  switch (action) {
    case 'deposit':
      gas = (110_000 * rsAmount + 50_000 + 15_000 * activeProposals);
      break;
    case 'redeem_lockup':
      gas = (110_000 * rsAmount + 40_000 + 15_000 * activeProposals);
      break;
    case 'redeem':
      gas = 80_000
      break;
  }

  return {
    amount: [{ amount: toUscrtFee(gas), denom: 'uscrt' }],
    gas: gas.toString(),
  };
};
