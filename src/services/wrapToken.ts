import { getFeeForExecute, notify } from 'blockchain-bridge';
import { SwapToken } from 'pages/TokenModal/types/SwapToken';
import { UserStoreEx } from 'stores/UserStore';
import { GAS_FOR_WRAP } from 'utils/gasPrices';

export async function serviceWrapToken(amount: string, token: SwapToken, user: UserStoreEx) {
  try {
    const res = await user.secretjsSend.asyncExecute(
      token.address,
      { deposit: { amount: amount } },
      '',
      [{ denom: 'uscrt', amount: amount }],
      getFeeForExecute(GAS_FOR_WRAP)
    );

    if (res.logs) {
      notify('success', 'Converted'); // The transaction was successful
    } else {
      throw new Error(res.raw_log); // The transaction was mined, but failed
    }

    await user.updateSScrtBalance();
    await user.updateScrtBalance();
  } catch (error) {
    notify('error', error.message);
  }
}

export async function serviceUnwrapToken(amount: string, token: SwapToken, user: UserStoreEx) {
  try {
    const res = await user.secretjsSend.asyncExecute(
      token.address,
      { redeem: { amount: amount } },
      '',
      [],
      getFeeForExecute(GAS_FOR_WRAP)
    );

    if (res.logs) {
      notify('success', 'Converted'); // The transaction was successful
    } else {
      throw new Error(res.raw_log); // The transaction was mined, but failed
    }

    await user.updateSScrtBalance();
    await user.updateScrtBalance();
  } catch (error) {
    notify('error', error.message);
  }
}
