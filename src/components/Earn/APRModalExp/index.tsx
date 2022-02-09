import { observer } from 'mobx-react';
import React, { ReactChild, useState, useEffect } from 'react';
import { Modal, Popup } from 'semantic-ui-react';
import Theme from 'themes';
import { getAPRStats, RewardsToken, StatsAPR } from '../EarnRow';
import './style.scss';
import { ExitIcon } from 'ui/Icons/ExitIcon';
import numeral from 'numeral';

interface ModalExplanationProps {
  token: RewardsToken;
  theme: Theme;
  children?: ReactChild;
  infinityPoolPrice?: number;
  infinityPoolSymbol?: String;
}
interface ModalMultiplierTipProps {
  multiplier: String;
  theme: Theme;
  children?: ReactChild;
}
const getLabel = (n: string): string => {
  switch (n) {
    case 'd1':
      return '1 d';
    case 'd7':
      return '7 d';
    case 'd30':
      return '30 d';
    case 'd365':
      return '365 d(APY)';
    default:
      return '';
  }
};

export const ModalExplanation = observer(({ token, theme, children, infinityPoolPrice, infinityPoolSymbol }: ModalExplanationProps) => {
  let stats = getAPRStats(token, Number(token.rewardsPrice));
  if (infinityPoolPrice !== undefined) {
    stats = getAPRStats(token, infinityPoolPrice, infinityPoolSymbol === 'SEFI');
  }

  return (
    <Popup position="bottom center" className={`apr-modal ${theme.currentTheme}`} trigger={children}>
      <div className="apr-modal-header">
        <h3>ROI Calculation</h3>
      </div>
      <div className="apr-base">
        <p>Base APR</p>
        <p>
          <strong>{formatRoi(stats?.apr)}</strong>
        </p>
      </div>
      <table>
        <thead>
          <tr>
            <td>Timeframe</td>
            <td>ROI</td>
            <td>{`${infinityPoolSymbol === undefined ? token.display_props.symbol : infinityPoolSymbol} per $1000`}</td>
          </tr>
        </thead>
        <tbody>
          {(stats && stats?.apr < 100) ? (
            Object.keys(stats?.roi).map((key, i) => (
              <tr key={key + i}>
                <td>{getLabel(key)}</td>
                <td>{formatRoi(stats?.roi[key])}</td>
                <td>{`${format(stats?.sefiP1000[key])} ($${format(stats?.usdP1000[key])})`}</td>
              </tr>
            ))
          ) : (
            Object.keys(stats?.roi).map((key, i) => (
              <tr key={key + i}>
                <td>{getLabel(key)}</td>
                <td>{`${getLabel(key) === '1 d' ? formatRoi(stats?.roi[key]) : '-'}`}</td>
                <td>{`${getLabel(key) === '1 d' ? `${format(stats?.sefiP1000[key])} ($${format(stats?.usdP1000[key])})` : '- ($-)'}`}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="extra-content">
        <ul>
          <li>Calculations are based on current rates</li>
          <li>Compounding 1x daily</li>
          <li>All figures are estimates and do not represent guaranteed returns</li>
        </ul>
      </div>
    </Popup>
  );
});

export const ModalMultiplierTip = observer(({ multiplier, theme, children }: ModalMultiplierTipProps) => {
  return (
    <Popup position="bottom center" className={`${theme.currentTheme}`} trigger={children}>
      <div className="extra-content">
        <p>Multiplier represents the proportion of SEFI rewards each farm receives, as a proportion of the SEFI produced each block.</p>
        <p>For example, if a 1x farm received 1 SEFI per block, a {multiplier}x farm would receive {multiplier} SEFI per block. This amount is already included in all APR calculations for the farm.</p>
      </div>
    </Popup>
  );
});

export const formatRoi = (n: string | number, noDecimals?: boolean): string => {
  if (noDecimals) {
    return numeral(n).format('0,0%');
  }
  return numeral(n).format('0,0.00%');
};

const format = (n: string | number): string => {
  return numeral(n).format('0,0.00');
};
