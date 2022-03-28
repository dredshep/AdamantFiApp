import * as React from 'react';
import { Box, BoxProps } from 'grommet';
import { IStyledChildrenProps } from 'interfaces';
import { withTheme } from 'styled-components';

export const PageContainer: React.FC<IStyledChildrenProps<BoxProps>> = withTheme(
  ({ children, theme, ...props }: IStyledChildrenProps<BoxProps>) => {
    return (
      <Box
        {...props}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'normal',
            padding: '0 3vw',
            minWidth: '100%',
          }}
        >
          {children}
        </div>
      </Box>
    );
  },
);
