import { globalTheme } from "../../globalTheme";
import toRgba from "../../utils/toRgba";

const colors = {
  backgrounds: {
    main: '#0B0A23',
    accent1: '#A68C57',
    accent2: '#B59D6B',
  },
  text: '#ffffff',
  primary: '#bb86fc',
  secondary: '#03dac6',
  error: '#cf6679',
  success: '#5cb85c',
  warning: '#f0ad4e',
} as const;

const darkTheme = {
  colors: {
    ...colors,
    backgrounds: {
      ...colors.backgrounds,
      card: toRgba(colors.backgrounds.main, 0.7),
      cardEmphasized: toRgba(colors.backgrounds.main, 0.8),
      accentGradient: `linear-gradient(270.36deg, ${colors.backgrounds.accent1} 0%, ${colors.backgrounds.accent2} 100%)`,
    },
  },
  ...globalTheme,
} as const;

export { darkTheme };
