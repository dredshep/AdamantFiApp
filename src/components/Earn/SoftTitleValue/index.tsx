import React from 'react';
import styles from './styles.styl';
import cn from 'classnames';
import { useStores } from 'stores';

const SoftTitleValue = (props: { title: string | JSX.Element; subTitle?: string | JSX.Element; isDetail?: boolean}) => {
  const {theme} = useStores();
  if (props.subTitle && props.isDetail !== true) {
    return (
      <div className={styles[theme.currentTheme]}>
        <h3 className={cn(styles.scrtAssetBalance)}>{props.title}</h3>
        <h5 className={cn(styles.subMenu)}>{props.subTitle}</h5>
      </div>
    );
  } else if (props.subTitle && props.isDetail === true) {
    return (
      <div className={styles[theme.currentTheme]}>
        <h3 className={cn(styles.detailsTitle, 'earn_center_ele')}>{props.title}</h3>
        <h5 className={cn(styles.detailsSubMenu, 'earn_center_ele')}>{props.subTitle}</h5>
      </div>
    );
  } else {
    return (
      <div>
        <h5 className={cn(styles.subMenu)}>{props.title}</h5>
      </div>
    );
  }
};

export default SoftTitleValue;
