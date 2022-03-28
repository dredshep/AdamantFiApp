import React from 'react';
import { Button, Container } from 'semantic-ui-react';
import { canonicalizeBalance, humanizeBalance, sortedStringify } from 'utils';
import { SwapAssetRow } from '../SwapAssetRow/SwapAssetRow';
import { AdditionalInfo } from './AdditionalInfo';
import { PriceRow } from '../../components/Swap/PriceRow';
import { SwapTokenMap } from '../TokenModal/types/SwapToken';
import { CosmWasmClient, ExecuteResult } from 'secretjs';
import { BigNumber } from 'bignumber.js';
import { cacheFeesForExecuteUSD, getFeeForExecute, Snip20Send } from '../../blockchain-bridge';
import { FlexRowSpace } from '../../components/Swap/FlexRowSpace';
import { PairMap, SwapPair } from '../TokenModal/types/SwapPair';
import cn from 'classnames';
import styles from './styles.styl';
import './style.scss'
import { RouteOutput, RouteRow } from 'components/Swap/RouteRow';
import { AsyncSender } from '../../blockchain-bridge/scrt/asyncSender';
import { UserStoreEx } from '../../stores/UserStore';
import stores from '../../stores';
import { observer } from 'mobx-react';
import { GAS_FOR_SWAP_DIRECT } from '../../utils/gasPrices';
import { Tokens } from 'stores/Tokens';
import { executeRouterSwap, executeSwapUscrt, getBestRoute, getHops, storeResult } from './SwapFunctions';
import { serviceUnwrapToken, serviceWrapToken } from 'services/wrapToken';

const baseButtonStyle = {
  margin: '1em 0 0 0',
  borderRadius: '4px',
  padding: '11px 42px',
  fontSize: '16px',
  fontWeight: '600',
  height: '46px',
};
const disableButtonStyle = { ...baseButtonStyle, color: '#5F5F6B', background: '#DEDEDE' };
const enableButtonStyle = { ...baseButtonStyle, color: '#FFFFFF', background: '#cb9b51' };
const errorButtonStyle = {
  ...baseButtonStyle,
  color: '#cb9b51',
  background: 'transparent',
  opacity: '1',
  cursor: 'default',
};
const BUTTON_MSG_ENTER_AMOUNT = 'Enter an amount';
const BUTTON_MSG_NO_ROUTE = 'No route available';
const BUTTON_MSG_LOADING_PRICE = 'Loading price data';
const BUTTON_CONNECTING_TO_CHAIN = 'Connect Wallet to Trade';
const BUTTON_MSG_NOT_ENOUGH_LIQUIDITY = 'Insufficient liquidity for this trade';
const BUTTON_MSG_SWAP = 'Swap';
const BUTTON_MSG_WRAP = 'Wrap SCRT';
const BUTTON_MSG_UNWRAP = 'Unwrap sSCRT';
const BUTTON_MSG_FINDING_ROUTE = 'Finding best route';
const BUTTON_MSG_SELECT_TOKEN = 'Select a token';

const actionButtonMessages = [BUTTON_MSG_SWAP, BUTTON_MSG_WRAP, BUTTON_MSG_UNWRAP];

const DEFAULT_SLIPPAGE = 0.5 / 100;

@observer
export class SwapTab extends React.Component<
  {
    user: UserStoreEx;
    secretjs: CosmWasmClient;
    secretjsSender: AsyncSender;
    tokens: SwapTokenMap;
    tokensStore: Tokens;
    balances: { [symbol: string]: BigNumber | JSX.Element };
    selectedToken0?: string;
    selectedToken1?: string;
    selectedPair: SwapPair;
    selectedPairRoutes: string[][];
    notify: (type: 'success' | 'error' | 'errorWithHash', msg: string, closesAfterMs?: number, txHash?: string) => void;
    onSetTokens: CallableFunction;
    refreshPools: CallableFunction;
    secretAddress: string;
    isSupported: boolean;
    pairs: PairMap;
    isLoadingSupportedTokens: boolean;
    updateBalances: Function;
  },
  {
    fromToken: string;
    toToken: string;
    fromInput: string;
    toInput: string;
    isFromEstimated: boolean;
    isToEstimated: boolean;
    spread: number;
    priceImpact: number;
    slippageTolerance: BigNumber;
    buttonMessage: string;
    loadingSwap: boolean;
    loadingBestRoute: boolean;
    bestRoute: string[];
    loadingPriceData: boolean;
    allRoutesOutputs: Array<RouteOutput>;
    cachedGasFeesUSD: number[];
  }
> {
  constructor(props) {
    super(props);

    this.state = {
      fromToken: this.props.selectedToken0 || this.props.tokens.get(globalThis.config.SSCRT_CONTRACT)?.identifier || '',
      toToken: this.props.selectedToken1 || '',
      fromInput: '',
      toInput: '',
      isFromEstimated: false,
      isToEstimated: false,
      spread: 0,
      priceImpact: 0,
      slippageTolerance: new BigNumber(DEFAULT_SLIPPAGE),
      buttonMessage: BUTTON_MSG_ENTER_AMOUNT,
      loadingSwap: false,
      loadingPriceData: false,
      loadingBestRoute: false,
      bestRoute: null,
      allRoutesOutputs: [],
      cachedGasFeesUSD: [],
    };
  }

  async componentDidUpdate(previousProps) {
    if (
      sortedStringify({ ...previousProps.balances, ...previousProps.selectedPairRoutes }) !==
      sortedStringify({ ...this.props.balances, ...this.props.selectedPairRoutes })
    ) {
      this.updateInputs();
    }
  }

  setStateWrapOrUnwrap(buttonMessage: string) {
    const { fromInput, toInput } = this.state;

    this.setState({
      toInput: this.state.isToEstimated ? fromInput : toInput,
      fromInput: this.state.isToEstimated ? fromInput : toInput,
      priceImpact: 0,
      buttonMessage,
      loadingBestRoute: false,
      slippageTolerance: new BigNumber(0) // No slippage in a wrap
    });
  }

  getPriceByDstAddress(dst_address: string): BigNumber {

    let token = this.props.tokens.get(dst_address);

    return new BigNumber(Number(token?.price));
  }

  updateInputsFromBestRoute() {
    const { fromToken, toToken, fromInput, toInput } = this.state;

    if (Number(fromInput) === 0 && this.state.isToEstimated) {
      return;
    }
    if (Number(toInput) === 0 && this.state.isFromEstimated) {
      return;
    }
    if (Number(fromInput) === 0 && Number(toInput) === 0) {
      return;
    }

    this.setState({ loadingBestRoute: true, bestRoute: null, allRoutesOutputs: [] });

    const cachedGasFeesUnfilledCoin = this.cacheFees(fromToken, toToken);

    const fromTokenSymbol = this.props.tokens.get(fromToken).symbol;
    const toTokenSymbol = this.props.tokens.get(toToken).symbol;

    if (fromTokenSymbol === 'SCRT' && toTokenSymbol === 'sSCRT') {
      this.setStateWrapOrUnwrap(BUTTON_MSG_WRAP);
      return;
    }
    else if (fromTokenSymbol === 'sSCRT' && toTokenSymbol === 'SCRT') {
      this.setStateWrapOrUnwrap(BUTTON_MSG_UNWRAP);
      return;
    }
    else {
      this.setState({
        slippageTolerance: new BigNumber(DEFAULT_SLIPPAGE) // It's not a wrap or unwrap, so set the slippage to default
      });
    }

    try {
      let { bestRoute, allRoutesOutputs, bestRouteToInput, bestRouteFromInput } = getBestRoute(fromInput, toInput, cachedGasFeesUnfilledCoin, this.state.isToEstimated, this.props.selectedPairRoutes, this.props.tokens, this.props.pairs, this.props.balances);

      if (bestRoute) {
        const ourPrice = bestRouteToInput.div(bestRouteFromInput);

        const fromTokenPrice = this.getPriceByDstAddress(fromToken);

        const marketPrice = fromTokenPrice.div(this.getPriceByDstAddress(toToken));

        const tenDollarsOfFromToken = new BigNumber(10.0).div(fromTokenPrice);

        let { bestRouteToInput:bestRouteToTenDollars, bestRouteFromInput:bestRouteFromTenDollars } = getBestRoute(tenDollarsOfFromToken, null, cachedGasFeesUnfilledCoin, this.state.isToEstimated, this.props.selectedPairRoutes, this.props.tokens, this.props.pairs, this.props.balances);
        const priceAtTenDollars = bestRouteToTenDollars.div(bestRouteFromTenDollars);
        let priceImpact = 1 - ourPrice.div(priceAtTenDollars);

        if (this.state.isToEstimated) {
          const toDecimals = this.props.tokens.get(toToken).decimals;
          this.setState({
            toInput: bestRouteToInput.toFixed(toDecimals, BigNumber.ROUND_DOWN),
            bestRoute,
            priceImpact,
            allRoutesOutputs,
          });
        } else {
          // isFromEstimated
          const fromDecimals = this.props.tokens.get(fromToken).decimals;
          this.setState({
            fromInput: bestRouteFromInput.toFixed(fromDecimals, BigNumber.ROUND_UP),
            bestRoute,
            priceImpact,
            allRoutesOutputs,
          });
        }
      } else {
        if (this.state.isToEstimated) {
          this.setState({ toInput: '' });
        } else {
          // isFromEstimated
          this.setState({ fromInput: '' });
        }
      }
    } catch (e) {
      console.error('Error finding best route:', e);
    }

    this.setState({ loadingBestRoute: false });
  }

  cacheFees(fromToken: string, toToken: string) {
    let cachedGasFeesUSD = cacheFeesForExecuteUSD(this.props.tokensStore); // Must use a temporary variable because the setState may not get updated in time
    this.setState({ cachedGasFeesUSD });
    let unfilledCoin;

    if (this.state.isToEstimated) { // top input is filled
      unfilledCoin = toToken;
    } else { // isFromEstimated, bottom input is filled
      unfilledCoin = fromToken;
    }

    // gas fees as expressed in the unfilled coin (can be the top or the bottom)
    return cachedGasFeesUSD.map(x => new BigNumber(x).div(this.getPriceByDstAddress(unfilledCoin)));
  }

  updateInputs() {
    this.setState({ bestRoute: null, allRoutesOutputs: [], buttonMessage: BUTTON_MSG_ENTER_AMOUNT });

    const routes = this.props.selectedPairRoutes;

    if (routes.length === 0) {
      this.setState({
        fromInput: '',
        isFromEstimated: false,
        toInput: '',
        isToEstimated: false,
      });
      return;
    }

    this.updateInputsFromBestRoute();
  }

  symbolFromAddress = (identifier: string) => {
    const uniqueSymbols = ['SCRT', 'SEFI', 'sSCRT'];
    const symbol = this.props.tokens.get(identifier)?.symbol;
    if (uniqueSymbols.includes(symbol)) {
      return symbol;
    } else {
      return symbol?.substring(1, symbol.length);
    }
  };

  async executeSwap(canonToInput:BigNumber, fromDecimals:number, toDecimals:number) {
    const { fromInput, fromToken, toToken, bestRoute, priceImpact, slippageTolerance } = this.state;
    const pair = this.props.selectedPair;
    this.setState({ loadingSwap: true });

    if (priceImpact >= 0.08) {
      const confirmString = 'confirm';
      const confirm = prompt(
        `Price impact for this swap is very high. Please type the word "${confirmString}" to continue.`,
      );
      if (confirm !== confirmString) {
        this.setState({ loadingSwap: false });
        return;
      }
    }

    try {
      const fromAmount = canonicalizeBalance(new BigNumber(fromInput), fromDecimals).toFixed(
        0,
        BigNumber.ROUND_DOWN,
        /*
      should be 0 fraction digits because of canonicalizeBalance,
      but to be sure we're rounding down to prevent over-spending
      */
      );

      // offer_amount: exactly how much we're sending
      // ask_amount: roughly how much we're getting
      // expected_return: at least ask_amount minus some slippage

      //const ask_amount = canonToInput;
      let expected_return = canonToInput
        .multipliedBy(new BigNumber(1).minus(slippageTolerance))
        .toFormat(0, { groupSeparator: '' });
      if (Number(expected_return) < 1) {
        // make sure even low value trade won't lose funds
        expected_return = '1';
      }

      const fromTokenSymbol = this.props.tokens.get(fromToken).symbol;
      const toTokenSymbol = this.props.tokens.get(toToken).symbol;

      if (fromTokenSymbol === 'SCRT' && toTokenSymbol === 'sSCRT') {
        await serviceWrapToken(fromAmount, this.props.tokens.get(toToken), this.props.user);
      }
      else if (fromTokenSymbol === 'sSCRT' && toTokenSymbol === 'SCRT') {
        await serviceUnwrapToken(fromAmount, this.props.tokens.get(fromToken), this.props.user);
      }
      else if (fromTokenSymbol === 'SCRT') {
        let result: ExecuteResult;
        if (bestRoute && bestRoute.length > 2) {
          const hops = await getHops(bestRoute, this.props.pairs, this.props.secretjs);

          result = await executeRouterSwap(
            this.props.secretjsSender,
            this.props.secretAddress,
            fromToken,
            fromAmount,
            hops,
            expected_return,
            bestRoute,
          );
        } else {
          result = await executeSwapUscrt(this.props.secretjsSender, pair, fromAmount, expected_return);
        }

        const { fromTokenFromTxn, toTokenFromTxn, sent, received } = storeResult(result, fromAmount, fromDecimals, bestRoute, toDecimals);

        this.props.notify(
          'success',
          `Swapped ${sent} ${this.props.tokens.get(fromTokenFromTxn)?.symbol} for ${received} ${this.props.tokens.get(toTokenFromTxn).symbol}`,
        );
      } else {
        let result: ExecuteResult;
        if (bestRoute && bestRoute.length > 2) {
          const hops = await getHops(bestRoute, this.props.pairs, this.props.secretjs);
          result = await executeRouterSwap(
            this.props.secretjsSender,
            this.props.secretAddress,
            fromToken,
            fromAmount,
            hops,
            expected_return,
            bestRoute,
          );
        } else {
          if (pair.assetIds().includes(fromToken) && pair.assetIds().includes(toToken)) {
            result = await Snip20Send({
              secretjs: this.props.secretjsSender,
              address: fromToken,
              amount: fromAmount,
              msg: btoa(
                JSON.stringify({
                  swap: {
                    expected_return,
                  },
                }),
              ),
              recipient: pair.contract_addr,
              fee: getFeeForExecute(GAS_FOR_SWAP_DIRECT),
            });
          } else {
            throw 'UI got out of sync with the chain, please refresh the page and try again';
          }
        }

        const { fromTokenFromTxn, toTokenFromTxn, sent, received } = storeResult(result, fromAmount, fromDecimals, bestRoute, toDecimals);

        this.props.notify(
          'success',
          `Swapped ${sent} ${this.props.tokens.get(fromTokenFromTxn).symbol} for ${received} ${this.props.tokens.get(toTokenFromTxn).symbol}`,
        );
      }
      await this.props.updateBalances();
    } catch (error) {
      console.error('Swap error', error);
      const txHash = error?.txHash;
      this.props.notify(
        'errorWithHash',
        `Error swapping ${fromInput} ${this.props.tokens.get(fromToken).symbol} for ${
          this.props.tokens.get(toToken).symbol
        }: ${error.message} ${txHash ? '\nTx Hash: ' + txHash : ''}`,
        undefined,
        txHash,
      );
      return;
    } finally {
      this.setState({
        loadingSwap: false,
      });
    }
    await this.props.onSetTokens(this.props.selectedToken0, this.props.selectedToken1, true);
    this.setState({
      toInput: '',
      fromInput: '',
      isFromEstimated: false,
      isToEstimated: false,
    });
  }

  render() {
    const pair = this.props.selectedPair;
    const ask_pool = pair
      ? new BigNumber(this.props.balances[`${this.state.toToken}-${pair?.identifier()}`] as BigNumber)
      : new BigNumber(0);
    const offer_pool = pair
      ? new BigNumber(this.props.balances[`${this.state.fromToken}-${pair?.identifier()}`] as BigNumber)
      : new BigNumber(0);

    const [fromBalance, toBalance] = [
      this.props.balances[this.state.fromToken],
      this.props.balances[this.state.toToken],
    ];

    const [fromDecimals, toDecimals] = [
      this.props.tokens.get(this.state.fromToken)?.decimals,
      this.props.tokens.get(this.state.toToken)?.decimals,
    ];

    const canonFromInput = canonicalizeBalance(new BigNumber(this.state.fromInput), fromDecimals);
    const canonToInput = canonicalizeBalance(new BigNumber(this.state.toInput), toDecimals);

    let buttonMessage: string;
    if (this.state.buttonMessage === BUTTON_MSG_WRAP || this.state.buttonMessage === BUTTON_MSG_UNWRAP) {
      buttonMessage = this.state.buttonMessage; // If it's set, keep it
    } else if (this.state.toToken === '' || this.state.fromToken === '') {
      buttonMessage = BUTTON_MSG_SELECT_TOKEN;
    } else if (this.state.loadingPriceData) {
      buttonMessage = BUTTON_MSG_LOADING_PRICE;
    } else if (this.props.isLoadingSupportedTokens || !this.props.user.isKeplrWallet) {
      buttonMessage = BUTTON_CONNECTING_TO_CHAIN;
    } else if (this.state.loadingBestRoute) {
      buttonMessage = BUTTON_MSG_FINDING_ROUTE;
    } else if (this.state.bestRoute) {
      if (this.state.fromInput === '' && this.state.toInput === '') {
        buttonMessage = BUTTON_MSG_ENTER_AMOUNT;
      } else if (new BigNumber(fromBalance as BigNumber).isLessThan(canonFromInput)) {
        buttonMessage = `Insufficient ${this.props.tokens.get(this.state.fromToken)?.symbol} balance`;
      } else if (this.state.fromInput === '' || this.state.toInput === '') {
        buttonMessage = BUTTON_MSG_LOADING_PRICE;
      } else {
        buttonMessage = BUTTON_MSG_SWAP;
      }
    } else if (this.props.selectedPairRoutes?.length > 0) {
      if (this.state.fromInput === '' && this.state.toInput === '') {
        buttonMessage = BUTTON_MSG_ENTER_AMOUNT;
      } else {
        buttonMessage = BUTTON_MSG_NOT_ENOUGH_LIQUIDITY;
      }
    } else if (!pair || this.props.selectedPairRoutes?.length == 0) {
      buttonMessage = BUTTON_MSG_NO_ROUTE;
    } else if (this.state.fromInput === '' && this.state.toInput === '') {
      buttonMessage = BUTTON_MSG_ENTER_AMOUNT;
    } else if (new BigNumber(fromBalance as BigNumber).isLessThan(canonFromInput)) {
      buttonMessage = `Insufficient ${this.props.tokens.get(this.state.fromToken)?.symbol} balance`;
    } else if (
      offer_pool.isZero() ||
      ask_pool.isZero() ||
      ask_pool.isLessThan(canonToInput) ||
      Number(this.state.fromInput) < 0 ||
      Number(this.state.toInput) < 0
    ) {
      buttonMessage = BUTTON_MSG_NOT_ENOUGH_LIQUIDITY;
    } else if (this.state.fromInput === '' || this.state.toInput === '') {
      buttonMessage = BUTTON_MSG_LOADING_PRICE;
    } else {
      buttonMessage = BUTTON_MSG_SWAP;
    }

    const hidePriceRow: boolean =
      this.state.toInput === '' ||
      this.state.fromInput === '' ||
      isNaN(Number(this.state.toInput) / Number(this.state.fromInput)) ||
      this.state.buttonMessage === BUTTON_MSG_LOADING_PRICE ||
      this.state.buttonMessage === BUTTON_MSG_NOT_ENOUGH_LIQUIDITY ||
      this.state.buttonMessage === BUTTON_MSG_NO_ROUTE;
    const price = new BigNumber(this.state.fromInput).div(new BigNumber(this.state.toInput));
    const btnError = buttonMessage == BUTTON_MSG_NO_ROUTE || buttonMessage == BUTTON_MSG_NOT_ENOUGH_LIQUIDITY;

    // liquidityProviderFee is 0.3% times the number of hops in the best route
    const liquidityProviderFee = this.state.bestRoute && new BigNumber(this.state.fromInput).times(0.3/100 * (this.state.bestRoute.length - 1));

    return (
      <>
        <Container className={`${styles.swapContainerStyle} ${styles[stores.theme.currentTheme]} swap-container-style`}>
          <SwapAssetRow
            secretjs={this.props.secretjs}
            label="From"
            disabled={this.state.isFromEstimated && this.state.loadingBestRoute}
            maxButton={true}
            halfButton={true}
            balance={fromBalance}
            tokens={this.props.tokens}
            token={this.state.fromToken}
            setToken={async (identifier: string) => {
              await this.setFromToken(identifier);
            }}
            amount={this.state.fromInput}
            isEstimated={
              false /* Eventually From is the exact amount that will be sent, so even if we estimate it in updateInputs we don't show the "(estimated)" label to the user */
            }
            setAmount={amount => this.setFromAmount(amount)}
            error={btnError}
          />
          <div
            className={`${styles.swap_middle_row} ${styles[stores.theme.currentTheme]}`}
          >
            {this.state.loadingSwap ? (
              <div>
                <img className={cn(styles.spin)} width="28" height="23" src="/static/logoIcon.svg" alt="Secret Swap" />
              </div>
            ) : (
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  // switch
                  this.setState(
                    {
                      toToken: this.state.fromToken,
                      toInput: this.state.isFromEstimated ? '' : this.state.fromInput,
                      isToEstimated: this.state.isFromEstimated,

                      fromToken: this.state.toToken,
                      fromInput: this.state.isToEstimated ? '' : this.state.toInput,
                      isFromEstimated: this.state.isToEstimated,
                    },
                    async () => {
                      this.setState({ bestRoute: null, allRoutesOutputs: [] });

                      await this.props.onSetTokens(this.state.fromToken, this.state.toToken);

                      this.updateInputs();
                    },
                  );
                }}
              >
                <img src="/static/exchange-arrows.svg" alt="exchange arrows" style={{width: "40px"}} className={`${styles.swapper_img} ${styles[stores.theme.currentTheme]}`}/>
              </div>
            )}
          </div>
          <SwapAssetRow
            secretjs={this.props.secretjs}
            label="To"
            disabled={this.state.isToEstimated && this.state.loadingBestRoute}
            maxButton={false}
            halfButton={false}
            balance={toBalance}
            tokens={this.props.tokens}
            token={this.state.toToken}
            setToken={async (identifier: string) => {
              await this.setToToken(identifier);
            }}
            amount={this.state.toInput}
            isEstimated={this.state.toInput !== '' /* this.state.isToEstimated */}
            setAmount={(value: string) => {
              this.setToAmount(value);
            }}
            error={btnError}
          />
          {!hidePriceRow && (
            <PriceRow
              fromToken={this.props.tokens.get(this.state.fromToken).symbol}
              toToken={this.props.tokens.get(this.state.toToken).symbol}
              price={price}
            />
          )}
          {btnError ? (
            <Button fluid style={errorButtonStyle}>
              {buttonMessage}
            </Button>
          ) : (
            <Button
              className={`${styles.swap_button} ${styles[stores.theme.currentTheme]}`}
              disabled={!actionButtonMessages.includes(buttonMessage) || this.state.loadingSwap}
              // loading={this.state.loadingSwap}
              primary={buttonMessage === BUTTON_MSG_SWAP}
              fluid
              onClick={() => this.executeSwap(canonToInput, fromDecimals, toDecimals)}
            >
              {buttonMessage}
            </Button>
          )}
          {(!hidePriceRow && (this.state.bestRoute || this.state.loadingBestRoute)) && (
            <RouteRow
              tokens={this.props.tokens}
              isLoading={this.state.loadingBestRoute}
              route={this.state.bestRoute}
              allRoutesOutputs={this.state.allRoutesOutputs}
              cachedGasFeesUSD={this.state.cachedGasFeesUSD}
            />
          )}
          {!hidePriceRow && (
            <div style={this.state.loadingSwap ? { opacity: '0.4' } : {}}>
              <AdditionalInfo
                fromToken={this.props.tokens.get(this.state.fromToken).symbol}
                toToken={this.props.tokens.get(this.state.toToken).symbol}
                liquidityProviderFee={liquidityProviderFee}
                priceImpact={this.state.priceImpact}
                minimumReceived={new BigNumber(this.state.toInput).multipliedBy(
                  new BigNumber(1).minus(this.state.slippageTolerance),
                )}
                pairAddress={this.state.bestRoute && this.props.selectedPair?.contract_addr}
                isSupported={this.props.isSupported}
              />
            </div>
          )}
        </Container>
      </>
    );
  }

  private setToAmount(value: string) {
    if (value === '' || Number(value) === 0) {
      this.setState({
        toInput: value,
        isToEstimated: false,
        fromInput: '',
        isFromEstimated: false,
        spread: 0,
        priceImpact: 0,
      });
      return;
    }

    this.setState(
      {
        toInput: value,
        fromInput: '',
        isToEstimated: false,
        isFromEstimated: true,
      },
      () => this.updateInputs(),
    );
  }

  private setFromAmount = (value: string) => {
    if (value === '' || Number(value) === 0) {
      this.setState({
        fromInput: value,
        isFromEstimated: false,
        toInput: '',
        isToEstimated: false,
        spread: 0,
        priceImpact: 0,
      });
      return;
    }

    this.setState(
      {
        fromInput: value,
        toInput: '',
        isFromEstimated: false,
        isToEstimated: true,
      },
      () => this.updateInputs(),
    );
  };

  private async setToToken(identifier: string) {
    const setStateCallback = async () => {
      this.setState({ bestRoute: null, allRoutesOutputs: [] });

      await this.props.onSetTokens(this.state.fromToken, this.state.toToken);

      if (this.state.fromToken) {
        // this.updateInputs();
      }
    };

    if (identifier === this.state.fromToken) {
      // switch
      this.setState(
        {
          toToken: identifier,
          fromToken: this.state.toToken,
          isFromEstimated: this.state.isToEstimated,
          isToEstimated: this.state.isFromEstimated,
          fromInput: this.state.toInput,
          toInput: this.state.fromInput,
        },
        setStateCallback,
      );
    } else {
      this.setState(
        {
          toToken: identifier,
          toInput: '',
          isToEstimated: true,
          isFromEstimated: false,
        },
        setStateCallback,
      );
    }
  }

  private async setFromToken(identifier: string) {
    const setStateCallback = async () => {
      this.setState({ bestRoute: null, allRoutesOutputs: [] });

      await this.props.onSetTokens(this.state.fromToken, this.state.toToken);

      if (this.state.toToken) {
        // this.updateInputs();
      }
    };

    if (identifier === this.state.toToken) {
      // switch
      this.setState(
        {
          fromToken: identifier,
          toToken: this.state.fromToken,
          isFromEstimated: this.state.isToEstimated,
          isToEstimated: this.state.isFromEstimated,
          fromInput: this.state.toInput,
          toInput: this.state.fromInput,
        },
        setStateCallback,
      );
    } else {
      this.setState(
        {
          fromToken: identifier,
          fromInput: '',
          isFromEstimated: true,
          isToEstimated: false,
        },
        setStateCallback,
      );
    }
  }
}
