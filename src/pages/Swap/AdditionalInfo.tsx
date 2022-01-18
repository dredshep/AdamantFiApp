import BigNumber from 'bignumber.js';
import React, { useState } from 'react';
import { Container, Popup, Icon } from 'semantic-ui-react';
import { useStores } from 'stores';
import { formatSignificantFigures } from 'utils';
import { PairAnalyticsLink } from '../../components/Swap/PairAnalyticsLink';
import style from './styles.styl';
export const AdditionalInfo = ({
  minimumReceived,
  maximumSold,
  liquidityProviderFee,
  priceImpact,
  fromToken,
  toToken,
  pairAddress,
}: {
  minimumReceived?: BigNumber,
  maximumSold?: BigNumber,
  liquidityProviderFee: BigNumber,
  isSupported: Boolean,
  priceImpact: number,
  fromToken: string,
  toToken: string,
  pairAddress: string,
}) => {
  const [minReceivedIconBackground, setMinReceivedIconBackground] = useState<string>('whitesmoke');
  const [liqProvFeeIconBackground, setLiqProvFeeIconBackground] = useState<string>('whitesmoke');
  const [priceImpactIconBackground, setPriceImpactIconBackground] = useState<string>('whitesmoke');
  const { theme, user } = useStores();

  return (
    <div style={{ maxWidth: '450px', minWidth: '450px' }}>
      <Container className={`${style.additionalInfo_container} ${style[theme.currentTheme]}`}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '0.2rem',
          }}
        >
          <span>
            {minimumReceived !== null ? 'Minimum Received' : 'Maximum Sold'}
            <Popup
              trigger={
                <Icon
                  name="help"
                  circular
                  size="tiny"
                  style={{
                    marginLeft: '0.5rem',
                    verticalAlign: 'middle',
                  }}
                  onMouseEnter={() => setMinReceivedIconBackground('rgb(237, 238, 242)')}
                  onMouseLeave={() => setMinReceivedIconBackground('whitesmoke')}
                />
              }
              content="Your transaction will revert if there is a large, unfavorable price movement before it is confirmed."
              position="top center"
            />
          </span>
          <strong>
            {formatSignificantFigures(minimumReceived, 6)} {toToken}
          </strong>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '0.2rem',
          }}
        >
          <span>
            Price Impact
            <Popup
              trigger={
                <Icon
                  name="help"
                  circular
                  size="tiny"
                  style={{
                    marginLeft: '0.5rem',
                    verticalAlign: 'middle',
                  }}
                  onMouseEnter={() => setPriceImpactIconBackground('rgb(237, 238, 242)')}
                  onMouseLeave={() => setPriceImpactIconBackground('whitesmoke')}
                />
              }
              content="The amount this trade will affect the price of this token pair."
              position="top center"
            />
          </span>
          <strong style={{ color: getPriceImpactColor(priceImpact) }}>{getPriceImpactString(priceImpact)}</strong>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '0.2rem',
          }}
        >
          <span>
            Liquidity Provider Fee
            <Popup
              trigger={
                <Icon
                  name="help"
                  circular
                  size="tiny"
                  style={{
                    marginLeft: '0.5rem',
                    verticalAlign: 'middle',
                  }}
                  onMouseEnter={() => setLiqProvFeeIconBackground('rgb(237, 238, 242)')}
                  onMouseLeave={() => setLiqProvFeeIconBackground('whitesmoke')}
                />
              }
              content="A portion of each trade (0.30%) goes to liquidity providers as a protocol incentive."
              position="top center"
            />
          </span>
          <strong>
            {formatSignificantFigures(liquidityProviderFee, 8)}
            &nbsp;
            {fromToken}
          </strong>
        </div>
        <PairAnalyticsLink pairAddress={pairAddress} />
      </Container>
    </div>
  );
};

function getPriceImpactColor(priceImpact: number): string {
  if (priceImpact > 0.05) return 'red'; // High

  if (priceImpact > 0.03) return 'orange'; // Medium

  return 'green'; // Low
}

function getPriceImpactString(priceImpact: number): string {
  if (isNaN(priceImpact) || Math.abs(priceImpact) === Infinity) return 'No price data';

  priceImpact = Math.max(0, priceImpact); //Do not show a Price Impact lower than 0

  return (
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(priceImpact * 100) + '%'
  );
}
