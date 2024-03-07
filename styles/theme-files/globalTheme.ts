export const globalTheme = {
  fonts: {
    body: 'Roboto, sans-serif',
    heading: 'Roboto, sans-serif',
  },
  fontSizes: {
    body: '16px',
    h1: '40px',
    h2: '32px',
    h3: '24px',
    h4: '20px',
    h5: '18px',
    h6: '16px',
  },
  fontWeights: {
    body: 400,
    heading: 700,
  },
  lineHeights: {
    body: 1.5,
    heading: 1.125,
  },
  letterSpacings: {
    body: 'normal',
    caps: '0.2em',
  },
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],
  sizes: {
    container: 1200,
  },
  breakpoints: ['40em', '52em', '64em'],
  radii: {
    small: '4px',
    default: '8px',
    card: '16px',
  },
  shadows: {
    card: '0px 4px 8px rgba(0, 0, 0, 0.25)',
  },
  zIndices: {
    dropdown: 10,
    modal: 100,
    tooltip: 1000,
  },
} as const;
