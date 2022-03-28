import React from 'react'
import { useHistory, Link } from 'react-router-dom'
import  "./sideNav.scss";
import { useStores } from '../../stores';

const SideNav = (props) => {
  const governancePaths = ['governance','proposal','sefistaking'];
  const history = useHistory();
  const { theme } = useStores();
  const isSwap = history.location.pathname === '/swap';
  const isPool = history.location.pathname === '/pool';
  const isEarn = history.location.pathname === '/earn';
  const isBuy = history.location.pathname === '/buy';
  // const isCashback = history.location.pathname === '/cashback';
  const isGovernance = governancePaths.some(string => history.location.pathname.includes(string));

  return (
    <nav>
      <div className={`${theme.currentTheme} sidenav`}>
          <ul>
              <li className={isSwap ? 'active':''}><Link to={"/swap"}>Swap</Link></li>
              <li  className={isPool ? 'active hide_mobile':'hide_mobile'}><Link to={"/pool"}>Pool</Link></li>
              <li  className={isEarn ? 'active':''}><Link to="/earn">Earn</Link></li>
              <li className={isGovernance ? 'active hide_mobile':'hide_mobile'}><Link to="/governance">Governance</Link></li>
              <li className={`btn-secondary`}>
                <Link to="/buy">Buy SCRT</Link>
              </li>
          </ul>
      </div>
    </nav>
  )
}

export default SideNav