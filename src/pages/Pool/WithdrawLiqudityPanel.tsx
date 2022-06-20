import BigNumber from 'bignumber.js';
import React, {useEffect, useState} from 'react';
import { CosmWasmClient } from 'secretjs';
import { Accordion, Button, Container, Divider, Header, Image } from 'semantic-ui-react';
import { CSSProperties } from 'styled-components';
import { displayHumanizedBalance, humanizeBalance } from 'utils';
import { PriceRow } from '../../components/Swap/PriceRow';
import { getFeeForExecute } from '../../blockchain-bridge';
import { FlexRowSpace } from '../../components/Swap/FlexRowSpace';
import { SwapTokenMap } from '../TokenModal/types/SwapToken';
import { SwapPair } from '../TokenModal/types/SwapPair';
import { DownArrow } from '../../ui/Icons/DownArrow';
import { PairAnalyticsLink } from '../../components/Swap/PairAnalyticsLink';
import Loader from 'react-loader-spinner';
import { shareOfPoolNumberFormat, storeTxResultLocally } from './utils';
import { AsyncSender } from '../../blockchain-bridge/scrt/asyncSender';
import Theme from 'themes';
import { GAS_FOR_WITHDRAW_LP_FROM_SWAP } from '../../utils/gasPrices';
import './style.scss'

export const WithdrawLiquidityPanel = (
  {
    tokens,
    balances,
    secretjs,
    secretjsSender,
    selectedPair,
    notify,
    getBalance,
    onCloseTab,
    theme,
    openRow,
    setOpenRow,
    id
  }: {tokens: SwapTokenMap,
    balances: { [symbol: string]: BigNumber | JSX.Element },
    secretjs: CosmWasmClient,
    secretjsSender: AsyncSender,
    selectedPair: SwapPair,
    notify: (type: 'success' | 'error', msg: string, closesAfterMs?: number) => void,
    getBalance: CallableFunction,
    onCloseTab: CallableFunction,
    theme: Theme,
    openRow: number,
    setOpenRow: Function,
    id: number}) =>
  {

    const [isLoading, setIsLoading] = useState(false)
    const [withdrawPercentage, setWithdrawPercentage] = useState(0)
    const [isActive, setIsActive] = useState(openRow === id)
    const [isLoadingBalance, setIsLoadingBalance] = useState(false)

    useEffect(() => {
      if (isActive && openRow !== id)
        setIsActive(false)
    }, [openRow]);

    let [symbolA, symbolB] = [
      selectedPair.asset_infos[0].symbol,
      selectedPair.asset_infos[1].symbol,
    ];

    if (symbolA === symbolB) {
      return null;
    }

    if (symbolB === 'sSCRT') {
      selectedPair = new SwapPair(
        symbolB,
        selectedPair.asset_infos[1].info,
        symbolA,
        selectedPair.asset_infos[0].info,
        selectedPair.contract_addr,
        selectedPair.liquidity_token,
        selectedPair.pair_identifier,
      );

      symbolB = symbolA;
      symbolA = 'sSCRT';
    }
    if (selectedPair.pair_identifier.includes(globalThis.config.SSCRT_CONTRACT)) {
      const tokenB = selectedPair.pair_identifier.split('/').filter(a => a !== globalThis.config.SSCRT_CONTRACT);
      selectedPair.pair_identifier = `${globalThis.config.SSCRT_CONTRACT}${SwapPair.id_delimiter}${tokenB}`;
    }

    const [tokenA, tokenB] = selectedPair.assetIds();

    const decimalsA = tokens.get(tokenA)?.decimals;
    const decimalsB = tokens.get(tokenB)?.decimals;

    const lpTokenBalance = balances[selectedPair.lpTokenSymbol()]; // LP-secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek/secret15grq8y54tvc24j8hf8chunsdcr84fd3d30fvqv
    const lpTokenTotalSupply = balances[selectedPair.liquidity_token + '-total-supply'] as BigNumber;

    let lpShare = new BigNumber(0);
    let lpShareJsxElement = lpTokenBalance; // View Balance
    let pooledTokenA: string;
    let pooledTokenB: string;

    const pairSymbol = selectedPair.identifier();
    const pairSymbolInverse = selectedPair
      .identifier()
      .split(SwapPair.id_delimiter)
      .reverse()
      .join(SwapPair.id_delimiter);

    const lpTokenBalanceNum = new BigNumber(lpTokenBalance as BigNumber);
    if (!lpTokenBalanceNum.isNaN()) {
      if (lpTokenTotalSupply?.isGreaterThan(0)) {
        lpShare = lpTokenBalanceNum.dividedBy(lpTokenTotalSupply);

        pooledTokenA = displayHumanizedBalance(
          humanizeBalance(
            lpShare.multipliedBy(
              (balances[`${tokenA}-${pairSymbol}`] ??
                balances[`${tokenA}-${pairSymbolInverse}`]) as BigNumber,
            ),
            decimalsA,
          ),
        );

        pooledTokenB = displayHumanizedBalance(
          humanizeBalance(
            lpShare.multipliedBy(
              (balances[`${tokenB}-${pairSymbol}`] ??
                balances[`${tokenB}-${pairSymbolInverse}`]) as BigNumber,
            ),
            decimalsB,
          ),
        );

        lpShareJsxElement = (
          <span>{`${shareOfPoolNumberFormat.format(
            lpTokenBalanceNum
              .multipliedBy(100)
              .dividedBy(lpTokenTotalSupply)
              .toNumber(),
          )}%`}</span>
        );
      } else {
        pooledTokenA = '0';
        pooledTokenB = '0';
        lpShareJsxElement = <span>0%</span>;
      }
    }

    const getLogo = (address: string) => (
      <Image
        src={tokens.get(address)?.logo}
        avatar
        style={{
          boxShadow: 'rgba(0, 0, 0, 0.075) 0px 6px 10px',
          borderRadius: '24px',
          maxHeight: '24px',
          maxWidth: '24px',
        }}
      />
    );

    const rowStyle: CSSProperties = {
      display: 'flex',
      padding: '0.5em 0 0 0',
      color: theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE',
    };

    const poolA = new BigNumber(balances[`${tokenA}-${pairSymbol}`] as any);
    const poolB = new BigNumber(balances[`${tokenB}-${pairSymbol}`] as any);

    const price = humanizeBalance(poolA, decimalsA).dividedBy(humanizeBalance(poolB, decimalsB));

    const lpTokenBalanceString = lpTokenBalanceNum.toFormat(0, {
      groupSeparator: '',
    });
    const amountInTokenDenom = lpTokenBalanceNum.multipliedBy(withdrawPercentage).toFormat(0, {
      groupSeparator: '',
    });

    return (
      <Container
        style={{
          padding: '.5rem 1rem',
          margin: '.5rem 0',
          borderRadius: '16px',
          border: theme.currentTheme == 'light' ? '1px solid #DEDEDE' : '1px solid white',
          backgroundColor: theme.currentTheme == 'light' ? 'white' : 'black',
        }}
      >
        <Accordion fluid>
          <Accordion.Title
            active={isActive}
            onClick={async () => {
              if (openRow === id) {
                setIsActive(false)
                setOpenRow(-1);
              } else {
                setIsActive(true)
                setIsLoadingBalance(true)
                // get balances and subscribe for events for this pair
                await getBalance(selectedPair);
                setIsLoadingBalance(false)
                setOpenRow(id);
              }
            }}
          >
            <div
              style={{
                display: 'flex',
              }}
            >
              {getLogo(tokenA)}
              {getLogo(tokenB)}
              <strong
                style={{
                  margin: 'auto',
                  color: theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE',
                }}
              >
                {selectedPair.humanizedSymbol()}
              </strong>
              <FlexRowSpace />
            </div>
          </Accordion.Title>
          <Accordion.Content active={isActive}>
            {isLoadingBalance ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Loader type="ThreeDots" color="#cb9b51" height="0.5em" />
              </div>
            ) : null}
            <div hidden={isLoadingBalance}>
              <div style={rowStyle}>
                <span>Your total pool tokens</span>
                <FlexRowSpace />
                {lpTokenBalanceNum.isNaN()
                  ? lpTokenBalance
                  : displayHumanizedBalance(humanizeBalance(lpTokenBalanceNum, 6))}
              </div>
              {!lpTokenBalanceNum.isNaN() && (
                <>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{`Pooled ${tokens.get(tokenA)?.symbol}`}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>{pooledTokenA}</span>
                    {getLogo(tokenA)}
                  </div>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{`Pooled ${tokens.get(tokenB)?.symbol}`}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>{pooledTokenB}</span>
                    {getLogo(tokenB)}
                  </div>
                  <div style={rowStyle}>
                    <span>Your pool share</span>
                    <FlexRowSpace />
                    {lpShareJsxElement}
                  </div>
                </>
              )}
              <PairAnalyticsLink pairAddress={selectedPair?.contract_addr} />
              {lpTokenBalanceNum.isNaN() || lpTokenBalanceString === '0' ? null : (
                <>
                  <Divider horizontal>
                    <Header as="h4" style={{ color: theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE' }}>
                      Withdraw
                    </Header>
                  </Divider>
                  <div
                    style={{
                      ...rowStyle,
                      fontSize: '50px',
                      paddingBottom: '0.2em',
                    }}
                  >
                    <FlexRowSpace />
                    {`${new BigNumber(withdrawPercentage * 100).toFixed(0)}%`}
                    <FlexRowSpace />
                  </div>
                  <div style={{ ...rowStyle, paddingBottom: '0.2em' }}>
                    <input
                      style={{
                        flex: 1,
                        margin: '0.75rem 0 0.5rem 0',
                      }}
                      type="range"
                      color='#cb9b51'
                      min={0}
                      max={1}
                      step={0.01}
                      value={withdrawPercentage}
                      onChange={e => {
                        setWithdrawPercentage(Number(e.target.value))
                      }}
                    />
                  </div>
                  <div style={rowStyle}>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        setWithdrawPercentage(0.25)
                      }}
                    >
                      25%
                    </Button>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        setWithdrawPercentage(0.5)
                      }}
                    >
                      50%
                    </Button>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        setWithdrawPercentage(0.75)
                      }}
                    >
                      75%
                    </Button>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        setWithdrawPercentage(1)
                      }}
                    >
                      MAX
                    </Button>
                  </div>
                  <div style={rowStyle}>
                    <FlexRowSpace />
                    <DownArrow />
                    <FlexRowSpace />
                  </div>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{tokens.get(tokenA)?.symbol}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>
                      {withdrawPercentage === 0 || withdrawPercentage === 1 ? null : '~'}
                      {displayHumanizedBalance(
                        new BigNumber(pooledTokenA.replace(/,/g, '')).multipliedBy(withdrawPercentage),
                      )}
                    </span>
                    {getLogo(tokenA)}
                  </div>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{tokens.get(tokenB)?.symbol}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>
                      {withdrawPercentage === 0 || withdrawPercentage === 1 ? null : '~'}
                      {displayHumanizedBalance(
                        new BigNumber(pooledTokenB.replace(/,/g, '')).multipliedBy(withdrawPercentage),
                      )}
                    </span>
                    {getLogo(tokenB)}
                  </div>
                  {!price.isNaN() && (
                    <PriceRow
                      fromToken={tokens.get(tokenA)?.symbol}
                      toToken={tokens.get(tokenB)?.symbol}
                      price={price}
                    />
                  )}
                  <div style={rowStyle}>
                    <FlexRowSpace />
                    <Button
                      primary
                      loading={isLoading}
                      disabled={isLoading || amountInTokenDenom === '0'}
                      className='withdrawBtn'
                      onClick={async () => {
                        setIsLoading(true)

                        try {
                          const result = await secretjsSender.asyncExecute(
                            selectedPair.liquidity_token,
                            {
                              send: {
                                recipient: selectedPair.contract_addr,
                                amount: amountInTokenDenom,
                                msg: btoa(
                                  JSON.stringify({
                                    withdraw_liquidity: {},
                                  }),
                                ),
                              },
                            },
                            '',
                            [],
                            getFeeForExecute(GAS_FOR_WITHDRAW_LP_FROM_SWAP),
                          );
                          storeTxResultLocally(result);
                          notify(
                            'success',
                            `Withdrawn ${100 * withdrawPercentage}% from your pooled ${selectedPair.humanizedSymbol()}`,
                          );

                          setWithdrawPercentage(0)
                          await getBalance(selectedPair);
                        } catch (error) {
                          notify(
                            'error',
                            `Error withdrawing ${100 *
                              withdrawPercentage}% from your pooled ${selectedPair.humanizedSymbol()}: ${
                              error.message
                            }`,
                          );
                          console.error(error);
                        }

                        setIsLoading(false)
                      }}
                    >
                      Withdraw
                    </Button>
                    <FlexRowSpace />
                  </div>
                </>
              )}
            </div>
          </Accordion.Content>
        </Accordion>
      </Container>
    );
}
