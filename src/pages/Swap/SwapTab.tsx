import React from 'react';
import { Button, Container } from 'semantic-ui-react';
import { canonicalizeBalance, humanizeBalance, sortedStringify } from 'utils';
import { SwapAssetRow } from './SwapAssetRow';
import { AdditionalInfo } from './AdditionalInfo';
import { PriceRow } from '../../components/Swap/PriceRow';
import { compute_offer_amount, compute_swap } from '../../blockchain-bridge/scrt/swap';
import { SigningCosmWasmClient } from 'secretjs';
import { TabsHeader } from './TabsHeader';
import { BigNumber } from 'bignumber.js';
import { extractValueFromLogs, getFeeForExecute } from '../../blockchain-bridge';
import { SwapTokenMap } from './types/SwapToken';
import { FlexRowSpace } from '../../components/Swap/FlexRowSpace';
import { SwapPair } from './types/SwapPair';
import { DownArrow } from '../../ui/Icons/DownArrow';
import cn from 'classnames';
import * as styles from './styles.styl';
import { storeTxResultLocally } from './utils';
import { Link, Node } from 'ngraph.graph';
import { RouteRow } from 'components/Swap/RouteRow';

const BUTTON_MSG_ENTER_AMOUNT = 'Enter an amount';
const BUTTON_MSG_NO_TRADNIG_PAIR = 'Trading pair does not exist';
const BUTTON_MSG_LOADING_PRICE = 'Loading price data';
const BUTTON_MSG_NOT_ENOUGH_LIQUIDITY = 'Insufficient liquidity for this trade';
const BUTTON_MSG_SWAP = 'Swap';

export class SwapTab extends React.Component<
  {
    secretjs: SigningCosmWasmClient;
    tokens: SwapTokenMap;
    balances: { [symbol: string]: BigNumber | JSX.Element };
    selectedToken0?: string;
    selectedToken1?: string;
    selectedPair: SwapPair;
    selectedPairRoutes: Node[][];
    notify: (type: 'success' | 'error', msg: string, closesAfterMs?: number) => void;
    onSetTokens: CallableFunction;
    refreshBalances: CallableFunction;
  },
  {
    fromToken: string;
    toToken: string;
    fromInput: string;
    toInput: string;
    isFromEstimated: boolean;
    isToEstimated: boolean;
    spread: number;
    commission: number;
    priceImpact: number;
    slippageTolerance: BigNumber;
    buttonMessage: string;
    loadingSwap: boolean;
    loadingBestRoute: boolean;
    bestRoute: Node[];
  }
> {
  constructor(props) {
    super(props);

    this.state = {
      fromToken: this.props.selectedToken0 || this.props.tokens.get(process.env.SSCRT_CONTRACT)?.identifier || '',
      toToken: this.props.selectedToken1 || '',
      fromInput: '',
      toInput: '',
      isFromEstimated: false,
      isToEstimated: false,
      spread: 0,
      commission: 0,
      priceImpact: 0,
      slippageTolerance: new BigNumber(0.5 / 100),
      buttonMessage: BUTTON_MSG_ENTER_AMOUNT,
      loadingSwap: false,
      loadingBestRoute: false,
      bestRoute: null,
    };
  }

  componentDidUpdate(previousProps) {
    if (sortedStringify(previousProps.balances) !== sortedStringify(this.props.balances)) {
      this.updateInputs();
    }

    //initial load
    // if (previousProps.tokens.size !== this.props.tokens.size) {
    //   const fromToken = this.props.tokens.values().next().value.identifier;
    //   const toToken = '';
    //   this.setState({
    //     fromToken,
    //     toToken,
    //   });
    // }
  }

  async updateInputsFromBestRoute() {
    if (Number(this.state.fromInput) === 0 && this.state.isToEstimated) {
      return;
    }
    if (Number(this.state.toInput) === 0 && this.state.isFromEstimated) {
      return;
    }
    if (Number(this.state.fromInput) === 0 && Number(this.state.toInput) === 0) {
      return;
    }

    this.setState({ loadingBestRoute: true, bestRoute: null });

    const routes = this.props.selectedPairRoutes;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i][0].id === this.state.toToken && routes[i][routes[i].length - 1].id === this.state.fromToken) {
        routes[i] = routes[i].reverse();
      }
    }

    // TODO if isFromEstimated:
    // 1. reverse all the routes
    // 2. use fromInput as offer_amount

    let bestRoute: Node[];
    let bestRouteOutput = new BigNumber(0);
    let bestRoutePriceImpact = 0;
    for (const routeTokens of routes) {
      let from = new BigNumber(this.state.fromInput);
      let to = new BigNumber(0);
      let priceImpacts: number[] = [];
      for (let i = 0; i < routeTokens.length - 1; i++) {
        const fromToken = String(routeTokens[i].id);
        const toToken = String(routeTokens[i + 1].id);
        const pair: SwapPair = routeTokens[i].links.find(
          l => [l.fromId, l.toId].sort().join() === [fromToken, toToken].sort().join(),
        ).data;

        const fromDecimals = this.props.tokens.get(fromToken).decimals;
        const toDecimals = this.props.tokens.get(toToken).decimals;

        // we normalize offer_pool & ask_pool
        // we could also canonicalize offer_amount & ask_amount
        // but this way is less code because we get the results normalized
        let offer_pool = humanizeBalance(
          new BigNumber(this.props.balances[`${fromToken}-${pair.identifier()}`] as any),
          fromDecimals,
        );
        let ask_pool = humanizeBalance(
          new BigNumber(this.props.balances[`${toToken}-${pair.identifier()}`] as any),
          toDecimals,
        );

        if (offer_pool.isNaN() || ask_pool.isNaN()) {
          const balances = await this.props.refreshBalances({
            tokenSymbols: [],
            pair,
          });
          offer_pool = humanizeBalance(
            new BigNumber(balances[`${fromToken}-${pair.identifier()}`] as any),
            fromDecimals,
          );
          ask_pool = humanizeBalance(new BigNumber(balances[`${toToken}-${pair.identifier()}`] as any), toDecimals);
        }

        if (offer_pool.isEqualTo(0) || ask_pool.isEqualTo(0)) {
          to = new BigNumber(0);
          break;
        }

        const offer_amount = from;

        const { return_amount, spread_amount, commission_amount } = compute_swap(offer_pool, ask_pool, offer_amount);

        if (return_amount.isNaN() || from.isNaN() || from.isZero()) {
          to = new BigNumber(0);
          break;
        }

        to = return_amount;
        priceImpacts.push(spread_amount.dividedBy(return_amount).toNumber());

        if (i < routeTokens.length - 2) {
          from = return_amount;
        }
      }

      if (to.isGreaterThan(bestRouteOutput)) {
        bestRouteOutput = to;
        bestRoute = routeTokens;
        bestRoutePriceImpact = Math.max(...priceImpacts);
      }
    }

    // TODO if isFromEstimated:
    // 1. reverse bestRoute
    // 2. use fromInput as ask_amount (? TODO make sure this is correct)

    if (bestRoute) {
      const toDecimals = this.props.tokens.get(String(bestRoute.slice(-1)[0].id)).decimals;
      this.setState({
        toInput: bestRouteOutput.toFixed(toDecimals),
        bestRoute,
        commission: (0.3 / 100) * Number(this.state.toInput),
        priceImpact: bestRoutePriceImpact,
      });
    }

    this.setState({ loadingBestRoute: false });
  }

  async updateInputs() {
    this.setState({ bestRoute: null });

    const pair = this.props.selectedPair;
    const routes = this.props.selectedPairRoutes;

    if (!pair && routes.length === 0) {
      this.setState({
        fromInput: '',
        isFromEstimated: false,
        toInput: '',
        isToEstimated: false,
      });
      return;
    }

    if (!pair && routes.length > 0) {
      this.updateInputsFromBestRoute();
      return;
    }

    const fromDecimals = this.props.tokens.get(this.state.fromToken).decimals;
    const toDecimals = this.props.tokens.get(this.state.toToken).decimals;

    // we normalize offer_pool & ask_pool
    // we could also canonicalize offer_amount & ask_amount
    // but this way is less code because we get the results normalized
    const offer_pool = humanizeBalance(
      new BigNumber(this.props.balances[`${this.state.fromToken}-${pair.identifier()}`] as any),
      fromDecimals,
    );
    const ask_pool = humanizeBalance(
      new BigNumber(this.props.balances[`${this.state.toToken}-${pair.identifier()}`] as any),
      toDecimals,
    );

    if (offer_pool.isNaN() || ask_pool.isNaN() || offer_pool.isEqualTo(0) || ask_pool.isEqualTo(0)) {
      return;
    }

    if (this.state.isToEstimated) {
      const offer_amount = new BigNumber(this.state.fromInput);

      const { return_amount, spread_amount, commission_amount } = compute_swap(offer_pool, ask_pool, offer_amount);

      if (return_amount.isNaN() || this.state.fromInput === '') {
        this.setState({
          isFromEstimated: false,
          toInput: '',
          isToEstimated: false,
          spread: 0,
          commission: 0,
          priceImpact: 0,
        });
      } else {
        this.setState({
          isFromEstimated: false,
          toInput: return_amount.isLessThan(0) ? '' : return_amount.toFixed(toDecimals),
          isToEstimated: return_amount.isGreaterThanOrEqualTo(0),
          spread: spread_amount.toNumber(),
          commission: commission_amount.toNumber(),
          priceImpact: spread_amount.dividedBy(return_amount).toNumber(),
        });
      }
    } else if (this.state.isFromEstimated) {
      const ask_amount = new BigNumber(this.state.toInput);

      const { offer_amount, spread_amount, commission_amount } = compute_offer_amount(offer_pool, ask_pool, ask_amount);

      if (offer_amount.isNaN() || this.state.toInput === '') {
        this.setState({
          isToEstimated: false,
          fromInput: '',
          isFromEstimated: false,
          spread: 0,
          commission: 0,
          priceImpact: 0,
        });
      } else {
        this.setState({
          isToEstimated: false,
          fromInput: offer_amount.isLessThan(0) ? '' : offer_amount.toFixed(fromDecimals),
          isFromEstimated: offer_amount.isGreaterThanOrEqualTo(0),
          spread: spread_amount.toNumber(),
          commission: commission_amount.toNumber(),
          priceImpact: spread_amount.dividedBy(ask_amount).toNumber(),
        });
      }
    }
  }

  render() {
    const pair = this.props.selectedPair;

    const ask_pool = pair
      ? new BigNumber(this.props.balances[`${this.state.toToken}-${pair?.identifier()}`] as BigNumber)
      : new BigNumber(0);
    const offer_pool = new BigNumber(this.props.balances[`${this.state.fromToken}-${pair?.identifier()}`] as any);

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
    if (this.state.bestRoute) {
      if (this.state.fromInput === '' && this.state.toInput === '') {
        buttonMessage = BUTTON_MSG_ENTER_AMOUNT;
      } else if (new BigNumber(fromBalance as BigNumber).isLessThan(canonFromInput)) {
        buttonMessage = `Insufficient ${this.props.tokens.get(this.state.fromToken)?.symbol} balance`;
      } else if (this.state.fromInput === '' || this.state.toInput === '') {
        buttonMessage = BUTTON_MSG_LOADING_PRICE;
      } else {
        buttonMessage = BUTTON_MSG_SWAP;
      }
    } else if (!pair) {
      buttonMessage = BUTTON_MSG_NO_TRADNIG_PAIR;
    } else if (this.state.fromInput === '' && this.state.toInput === '') {
      buttonMessage = BUTTON_MSG_ENTER_AMOUNT;
    } else if (new BigNumber(fromBalance as BigNumber).isLessThan(canonFromInput)) {
      buttonMessage = `Insufficient ${this.props.tokens.get(this.state.fromToken)?.symbol} balance`;
    } else if (offer_pool.isZero() || ask_pool.isZero() || ask_pool.isLessThan(canonToInput)) {
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
      this.state.buttonMessage === BUTTON_MSG_NO_TRADNIG_PAIR;
    const price = Number(this.state.fromInput) / Number(this.state.toInput);

    return (
      <>
        <Container className={cn(styles.swapContainerStyle)}>
          <TabsHeader />
          <SwapAssetRow
            secretjs={this.props.secretjs}
            label="From"
            maxButton={true}
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
          />
          <div
            style={{
              padding: '1em',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FlexRowSpace />
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => {
                this.setState(
                  {
                    toToken: this.state.fromToken,
                    toInput: this.state.fromInput,
                    isToEstimated: this.state.isFromEstimated,

                    fromToken: this.state.toToken,
                    fromInput: this.state.toInput,
                    isFromEstimated: this.state.isToEstimated,
                  },
                  () => {
                    this.updateInputs();
                    this.props.onSetTokens(this.state.fromToken, this.state.toToken);
                  },
                );
              }}
            >
              <DownArrow />
            </span>
            <FlexRowSpace />
          </div>
          <SwapAssetRow
            secretjs={this.props.secretjs}
            label="To"
            maxButton={false}
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
          />
          {!hidePriceRow && (
            <PriceRow
              fromToken={this.props.tokens.get(this.state.fromToken).symbol}
              toToken={this.props.tokens.get(this.state.toToken).symbol}
              price={price}
            />
          )}
          {(this.state.bestRoute || this.state.loadingBestRoute) && (
            <RouteRow tokens={this.props.tokens} isLoading={this.state.loadingBestRoute} route={this.state.bestRoute} />
          )}
          <Button
            disabled={buttonMessage !== BUTTON_MSG_SWAP || this.state.loadingSwap}
            loading={this.state.loadingSwap}
            primary={buttonMessage === BUTTON_MSG_SWAP}
            fluid
            style={{
              margin: '1em 0 0 0',
              borderRadius: '12px',
              padding: '18px',
              fontSize: '20px',
            }}
            onClick={async () => {
              if (this.state.priceImpact >= 0.15) {
                const confirmString = 'confirm';
                const confirm = prompt(
                  `Price impact for this swap is very high. Please type the word "${confirmString}" to continue.`,
                );
                if (confirm !== confirmString) {
                  return;
                }
              }

              this.setState({ loadingSwap: true });
              const { fromInput, fromToken, toToken } = this.state;
              const pair = this.props.selectedPair;

              try {
                const { decimals } = this.props.tokens.get(this.state.fromToken);
                const fromAmount = canonicalizeBalance(new BigNumber(this.state.fromInput), decimals).toFixed(
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
                const expected_return = canonToInput
                  .multipliedBy(new BigNumber(1).minus(this.state.slippageTolerance))
                  .toFormat(0, { groupSeparator: '' });

                if (this.state.fromToken === 'uscrt') {
                  const result = await this.props.secretjs.execute(
                    pair.contract_addr,
                    {
                      swap: {
                        offer_asset: {
                          info: { native_token: { denom: 'uscrt' } },
                          amount: fromAmount,
                        },
                        expected_return,
                        // offer_asset: Asset,
                        // expected_return: Option<Uint128>
                        // belief_price: Option<Decimal>,
                        // max_spread: Option<Decimal>,
                        // to: Option<HumanAddr>, // TODO
                      },
                    },
                    '',
                    [
                      {
                        amount: fromAmount,
                        denom: 'uscrt',
                      },
                    ],
                    getFeeForExecute(500_000),
                  );
                  storeTxResultLocally(result);

                  const sent = humanizeBalance(
                    new BigNumber(extractValueFromLogs(result, 'offer_amount')),
                    fromDecimals,
                  ).toFixed();
                  const received = humanizeBalance(
                    new BigNumber(extractValueFromLogs(result, 'return_amount')),
                    toDecimals,
                  ).toFixed();

                  this.props.notify(
                    'success',
                    `Swapped ${sent} ${this.props.tokens.get(fromToken)?.symbol} for ${received} ${
                      this.props.tokens.get(toToken).symbol
                    }`,
                  );
                } else {
                  const result = await this.props.secretjs.execute(
                    this.props.tokens.get(this.state.fromToken).address,
                    {
                      send: {
                        recipient: pair.contract_addr,
                        amount: fromAmount,
                        msg: btoa(
                          JSON.stringify({
                            swap: {
                              expected_return,
                              // expected_return: Option<Uint128>
                              // belief_price: Option<Decimal>,
                              // max_spread: Option<Decimal>,
                              // to: Option<HumanAddr>, // TODO
                            },
                          }),
                        ),
                      },
                    },
                    '',
                    [],
                    getFeeForExecute(500_000),
                  );
                  storeTxResultLocally(result);

                  const sent = humanizeBalance(
                    new BigNumber(extractValueFromLogs(result, 'offer_amount')),
                    fromDecimals,
                  ).toFixed();
                  const received = humanizeBalance(
                    new BigNumber(extractValueFromLogs(result, 'return_amount')),
                    toDecimals,
                  ).toFixed();

                  this.props.notify(
                    'success',
                    `Swapped ${sent} ${this.props.tokens.get(fromToken).symbol} for ${received} ${
                      this.props.tokens.get(toToken).symbol
                    }`,
                  );
                }
              } catch (error) {
                console.error('Swap error', error);
                this.props.notify(
                  'error',
                  `Error swapping ${fromInput} ${this.props.tokens.get(fromToken).symbol} for ${
                    this.props.tokens.get(toToken).symbol
                  }: ${error.message}`,
                );
                this.setState({
                  loadingSwap: false,
                });
                return;
              }

              this.setState({
                loadingSwap: false,
                toInput: '',
                fromInput: '',
                isFromEstimated: false,
                isToEstimated: false,
              });
            }}
          >
            {buttonMessage}
          </Button>
        </Container>
        {!hidePriceRow && (
          <AdditionalInfo
            fromToken={this.props.tokens.get(this.state.fromToken).symbol}
            toToken={this.props.tokens.get(this.state.toToken).symbol}
            liquidityProviderFee={this.state.commission * price}
            priceImpact={this.state.priceImpact}
            minimumReceived={new BigNumber(this.state.toInput).multipliedBy(
              new BigNumber(1).minus(this.state.slippageTolerance),
            )}
            pairAddress={this.props.selectedPair?.contract_addr}
            /*
            maximumSold={
              this.state.isFromEstimated
                ? Number(this.state.fromInput) *
                  (1 + this.state.slippageTolerance)
                : null
            }
            */
          />
        )}
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
        commission: 0,
        priceImpact: 0,
      });
      return;
    }

    this.setState(
      {
        toInput: value,
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
        commission: 0,
        priceImpact: 0,
      });
      return;
    }

    this.setState(
      {
        fromInput: value,
        isFromEstimated: false,
        isToEstimated: true,
      },
      () => this.updateInputs(),
    );
  };

  private async setToToken(identifier: string) {
    const setStateCallback = async () => {
      if (this.state.fromToken) {
        await this.updateInputs();
      }

      await this.props.onSetTokens(this.state.fromToken, this.state.toToken);
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
      if (this.state.toToken) {
        await this.updateInputs();
      }

      await this.props.onSetTokens(this.state.fromToken, this.state.toToken);
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
