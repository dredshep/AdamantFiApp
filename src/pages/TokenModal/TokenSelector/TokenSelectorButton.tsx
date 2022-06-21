import React from 'react';
import styles from './styles.styl';
import cn from 'classnames';
import { TokenButton } from './TokenButton';
import { SwapToken } from '../types/SwapToken';
import {ExpandIcon} from '../../../ui/Icons/ExpandIcon';
import { useStores } from 'stores';

export const TokenSelectorButton = (props: { token?: SwapToken; onClick?: any }) => {
  const isEmpty = !props?.token;
  const {theme} = useStores();
  return isEmpty ? (
    <div className={`${styles.selectATokenButton} ${styles[theme.currentTheme]}`} onClick={props.onClick}>
      <img src="/static/token-select.svg" alt="Select" className={`${styles.selectATokenImg}`}/>
      <span>Select a token</span>
      <img src="/static/angle-down.svg" alt="Down" className={`${styles.selectATokenDownAngle} ${styles[theme.currentTheme]}`}/>
    </div>
  ) : (
    <TokenButton token={props.token} onClick={props.onClick} />
  );
};
