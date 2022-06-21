import styles from './styles.styl';
import cn from 'classnames';
import React from 'react';
import { Image } from 'semantic-ui-react';
import { ExpandIcon } from '../../../ui/Icons/ExpandIcon';
import { SwapToken } from '../types/SwapToken';
import { truncateSymbol } from '../../../utils';
import { useStores } from 'stores';

export const TokenButton = (props: { token: SwapToken; onClick?: any }) => {
  const {theme} = useStores()
  return (
    <div className={`${styles.tokenButton} ${styles[theme.currentTheme]}`} onClick={props.onClick}>
      <img src={props.token.logo} className={`${styles.swapTokenImg}`} />
      <span>{truncateSymbol(props.token.symbol)}</span>
      <img src="/static/angle-down.svg" alt="Down" className={`${styles.selectATokenDownAngle} ${styles[theme.currentTheme]}`}/>
    </div>
  );
};
