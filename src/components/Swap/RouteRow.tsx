import { SwapTokenMap } from 'pages/TokenModal/types/SwapToken';
import React, { useState } from 'react';
import { Icon, Image, Popup } from 'semantic-ui-react';
import { FlexRowSpace } from './FlexRowSpace';
import Loader from 'react-loader-spinner';
import BigNumber from 'bignumber.js';
import { formatAsUSD, formatSignificantFigures } from 'utils';
import { useStores } from 'stores';

const routeLink = (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export const RouteRow = ({
  isLoading,
  tokens,
  route,
  allRoutesOutputs,
  cachedGasFeesUSD,
}: {
  isLoading: boolean,
  tokens: SwapTokenMap,
  route: string[],
  allRoutesOutputs: Array<RouteOutput>,
  cachedGasFeesUSD: number[],
}) => {
  const [iconBackground, setIconBackground] = useState('whitesmoke');
  const { theme } = useStores();

  if ((!route || route.length === 0) && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        style={{
          paddingTop: isLoading ? '1em' : '0.5em',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Finding best route...
        <FlexRowSpace />
        <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" />
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: isLoading ? '1em' : '0.5em',
        display: 'flex',
        alignItems: 'center',
        color: theme.currentTheme === 'light' ? '#5F5F6B' : '#DEDEDE',
      }}
    >
      Route
      <Popup
        trigger={
          <Icon
            name="help"
            circular
            size="tiny"
            style={{
              marginLeft: '0.5rem',
              background: theme.currentTheme == 'light' ? 'whitesmoke' : 'rgba(255, 255, 255, 0.1)',
              verticalAlign: 'middle',
            }}
            onMouseEnter={() => setIconBackground('rgb(237, 238, 242)')}
            onMouseLeave={() => setIconBackground('whitesmoke')}
          />
        }
        style={{ maxWidth: '600px' }}
        content={
          <div>
            <div>
              <strong>Routing through these tokens resulted in the best price for your trade.</strong>
            </div>
            {allRoutesOutputs
              .slice()
              .sort((a, b) => {
                if (a.toWithGas) {
                  return b.toWithGas.minus(a.toWithGas).toNumber();
                } else {
                  return a.fromWithGas.minus(b.fromWithGas).toNumber();
                }
              })
              .slice(0, 10) // Only show the top 10 results in the pop-up
              .map(row => (
                <RoutingDetailsRow r={row} key={row.route.join()}/>
              ))}
          </div>
        }
        position="left center"
      />
      <FlexRowSpace />
      {isLoading ? <Loader type="ThreeDots" color="#00BFFF" height="1em" width="1em" /> : <Route currentTheme={theme.currentTheme} route={route} tokens={tokens} />}
    </div>
  );

  function RoutingDetailsRow({ r }: { r: RouteOutput }) {
    const outputToken = r.fromOutput ? tokens.get(r.route[0]) : tokens.get(r.route[r.route.length - 1]);

    function Costs({ output }: { output: BigNumber }) {
      return (
        <span style={{ marginRight: '0.3em', whiteSpace: 'nowrap' }}>
          ({formatSignificantFigures(output, 6)} {outputToken.symbol}
          <wbr />
          &nbsp;+ ~{formatAsUSD(cachedGasFeesUSD[r.route.length - 1])} gas)
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', marginTop: '0.3em', alignItems: 'center' }}>
        {r.fromOutput && <Costs output={r.fromOutput} />}
        &nbsp;
        <Route currentTheme="light" route={r.route} tokens={tokens} />
        &nbsp;
        {r.toOutput && <Costs output={r.toOutput} />}
      </div>
    );
  }
};

const Route = ({ route, tokens, currentTheme }: { route: string[], tokens: SwapTokenMap, currentTheme: any }) => {
  return (
    <>
      {route.map((node, idx) => {
        const token = tokens.get(node);
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: currentTheme === 'light' ? '#686991' : '#DEDEDE',
            }}
            key={token.identifier}
          >
            <Image
              src={token.logo}
              avatar
              style={{
                boxShadow: 'rgba(0, 0, 0, 0.075) 0px 6px 10px',
                borderRadius: '24px',
                maxHeight: '24px',
                maxWidth: '24px',
              }}
            />
            {token.symbol} {idx < route.length - 1 && routeLink}
          </div>
        );
      })}
    </>
  );
};

export type RouteOutput = {
  route: string[],
  toOutput?: BigNumber,
  fromOutput?: BigNumber,
  toWithGas?: BigNumber,
  fromWithGas?: BigNumber,
};
