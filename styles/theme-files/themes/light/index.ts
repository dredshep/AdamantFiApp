import { globalTheme } from "../../globalTheme";
import toRgba from "../../utils/toRgba";

const rawColors = {
  backgrounds: {
    main: '#FFFFFF',
    accent1: '#D6C1A3',
    accent2: '#E2D4B7',
  },
  text: '#000000',
  primary: '#6200ee',
  secondary: '#03dac6',
  error: '#b00020',
  success: '#4caf50',
  warning: '#ff9800',
} as const;

const lightTheme = {
  colors: {
    ...rawColors,
    backgrounds: {
      ...rawColors.backgrounds,
      card: toRgba(rawColors.backgrounds.main, 0.7),
      cardEmphasized: toRgba(rawColors.backgrounds.main, 0.8),
      accentGradient: `linear-gradient(270.36deg, ${rawColors.backgrounds.accent1} 0%, ${rawColors.backgrounds.accent2} 100%)`,
    },
  },
  ...globalTheme,
} as const;

export { lightTheme };
