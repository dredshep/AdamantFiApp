import React from 'react';
import {useStores} from '../../stores';

const Tab: React.FC<{ name: string }> = ({ name }) => {
  const isSelected = window.location.hash === `#${name}`;
  const { theme } = useStores();
  const opacity = theme.currentTheme === 'dark' ? '0.8' : '0.2';
  const leftTab = 'Provide' === name;

  return (
    <strong
      style={{
        padding: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        borderRadius: leftTab ? '10px 0 0 10px' : '0 10px 10px 0',
        border: '2px solid #cb9b51',
        width: '224px',
        background: isSelected ? '#cb9b51' : 'rgba(65, 50, 25,' + opacity + ')',
        color: isSelected ? '#eee' : '#888',
        textAlign: 'center'
      }}
      onClick={() => {
        if (!isSelected) {
          window.location.hash = name;
        }
      }}
    >
      {name}
    </strong>
  );
};

export class TabsHeader extends React.Component {
  constructor(props: Readonly<{}>) {
    super(props);
  }

  render() {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '1em',
        }}
      >
        {/* <Tab name="Swap" /> */}
        <Tab name="Provide" />
        <Tab name="Withdraw" />
        {/* <Tab name="History" /> */}
      </div>
    );
  }
}
