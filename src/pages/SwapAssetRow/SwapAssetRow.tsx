import BigNumber from 'bignumber.js';
import React from 'react';
import { displayHumanizedBalance, formatWithTwoDecimals, humanizeBalance } from 'utils';
import { Button, Container, Popup } from 'semantic-ui-react';
import Loader from 'react-loader-spinner';
import { TokenSelector } from '../TokenModal/TokenSelector/TokenSelector';
import { SwapInput } from '../../components/Swap/SwapInput';
import { SigningCosmWasmClient } from 'secretjs';
import { SwapTokenMap } from '../TokenModal/types/SwapToken';
import { CosmWasmClient } from 'secretjs';
import { FlexRowSpace } from '../../components/Swap/FlexRowSpace';
import { useStores } from 'stores';
import './style.scss';

const PricePopup = () => (
  <Popup content='This price is an approximation' position="bottom center" trigger={<img width="12px" src="/static/info.svg" alt="" style={{filter: "invert(60%) sepia(19%) saturate(1005%) hue-rotate(357deg) brightness(101%) contrast(97%)"}}/>} />
)

export const SwapAssetRow = ({
  tokens,
  token,
  setToken,
  amount,
  setAmount,
  isEstimated,
  balance,
  label,
  maxButton,
  halfButton,
  secretjs,
  error,
  disabled,
}: {
  tokens: SwapTokenMap;
  token: string;
  setToken: (symbol: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  isEstimated: boolean;
  balance: BigNumber | JSX.Element;
  label?: string;
  maxButton: boolean;
  halfButton: boolean;
  secretjs: CosmWasmClient;
  disabled?: boolean;
  error?: boolean;
}) => {
  const { theme } = useStores();
  const font = {
    fontWeight: 400,
    fontSize: '14px',
    color: theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE',
    fontFamily: 'Poppins,Arial, Helvetica, sans-serif',
  };
  const balanceStyle = {
    display: 'flex',
    paddingBottom: '0.75rem',
    ...font,
  };

  let tokenInfo
  if (token)
    tokenInfo = tokens.get(token)

  return (
    <>
      <div className='swap_row'>
        <div
          className={`swap_row_container ${[theme.currentTheme]}`}
          id="SwapAssetRow_container"
        >
        <div className={`balance-row ${!!label ? 'has-label' : 'no-label'}`}>
        {label &&
        <div className='swap_label'>
            <span className={`${[theme.currentTheme]}`}>
              {label}
            </span>
        </div>}
        <div className='swap_balance'>
          {token && (
          <div style={balanceStyle} className='balance-value'>
            <span>Balance:</span>
            {(() => {
              if (balance === undefined) {
                return (
                  <div className='loader-container'>
                    <Loader type="ThreeDots" color="#cb9b51" height="1em" width="1em" style={{ display: 'flex', margin: '0 0.5rem' }} />
                  </div>
                );
              }

              if (JSON.stringify(balance).includes('View')) {
                return balance;
              }

              if (tokens.size > 0) {
                const hum = displayHumanizedBalance(
                  humanizeBalance(new BigNumber(balance as BigNumber), tokens.get(token)?.decimals),
                  BigNumber.ROUND_DOWN,
                );
                return isNaN(parseFloat(hum)) ? 0 : hum;
              }
              return undefined;
            })()}
          </div>
        )}
        <div className='swap_input_btns'>
                <>{halfButton && token && <Button
                  basic
                  className={`${[theme.currentTheme]} half_button`}
                  disabled={new BigNumber(balance as any).isNaN()}
                  onClick={() => {
                    const { decimals } = tokens.get(token);

                    let leftoverForGas = 0;
                    if (token === 'uscrt') {
                      leftoverForGas = 0.5;
                    }

                    setAmount(
                      humanizeBalance(new BigNumber(balance as any).multipliedBy(0.5), decimals)
                        .minus(leftoverForGas)
                        .toFixed(decimals),
                    );
                  }}
                >
                  <span>50%</span>
                </Button>}
                {maxButton && token && <Button
                  basic
                  className={`${[theme.currentTheme]} max_button`}
                  disabled={new BigNumber(balance as any).isNaN()}
                  onClick={() => {
                    const { decimals } = tokens.get(token);

                    let leftoverForGas = 0;
                    if (token === 'uscrt') {
                      leftoverForGas = 0.5;
                    }

                    setAmount(
                      humanizeBalance(new BigNumber(balance as any), decimals)
                        .minus(leftoverForGas)
                        .toFixed(decimals),
                    );
                  }}
                >
                  <span>MAX</span>
                </Button>}</>
              </div>
        </div>
          </div>
          <div
            className='swap_inputs'
          >
            <TokenSelector
              secretjs={secretjs}
              tokens={Array.from(tokens.values())}
              token={token ? tokens.get(token) : undefined}
              onClick={token => {
                setToken(token);
              }}
            />
            <div className='swap_input_value'>
              <SwapInput
                value={amount}
                error={error}
                disabled={disabled}
                setValue={value => {
                  if (isNaN(Number(value))) {
                    return;
                  }
                  setAmount(value);
                }}
              />
              <div className={`swap_input_price ${theme.currentTheme}`}>
                {(tokenInfo && Number(amount)) ?
                <>
                  <span>&asymp;{` $${formatWithTwoDecimals(tokenInfo.price * Number(amount))} USD`}</span>
                  <PricePopup />
                </>
                : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
