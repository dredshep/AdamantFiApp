import { observer } from 'mobx-react';
import React, { ReactChild } from 'react';
import { Popup } from 'semantic-ui-react';
import Theme from 'themes';
import './ModalStyle.scss';

interface ModalInfinityProps {
  theme: Theme;
  children?: ReactChild;
}
export const ModalInfinityWithdraw = observer(({ theme, children }: ModalInfinityProps) => {
  return (
    <Popup position="bottom center" className={`${theme.currentTheme}`} trigger={children}>
      <div className="extra-content">
        <p>Withdraw details</p>
        <p>Unstaked amounts unlock then accumulate as a total to withdraw</p>
      </div>
    </Popup>
  );
});

export const ModalInfinityCountdown = observer(({ theme, children }: ModalInfinityProps) => {
  return (
    <Popup position="bottom center" className={`${theme.currentTheme}`} trigger={children}>
      <div className="extra-content">
        <p>Countdown details</p>
        <p>Up to three closest upcoming actions will list. Unlisted actions come into view as amounts unlock</p>
      </div>
    </Popup>
  );
});

export const ModalInfinityViewingKey = observer(({ theme, children }: ModalInfinityProps) => {
  return (
    <Popup position="bottom center" className={`${theme.currentTheme}`} trigger={children}>
      <div className="extra-content">
        <p>Must create a viewing key first before seeing how much is available to withdraw from the infinity pool.</p>
      </div>
    </Popup>
  );
});
