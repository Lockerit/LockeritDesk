// shared/theme/theme.js
import { createTheme } from '@mui/material/styles';
import '@fontsource/nunito';

// IMPORTA LA CONFIG (ajusta la ruta)
import setupConfig from '../../../configFiles/setup_config.json';

// Colores por defecto
const DEFAULT_COLORS = {
  primaryMain: '#009640',
  primaryContrastText: '#ffffff',

  secondaryMain: '#0c315e',
  secondaryContrastText: '#ffffff',

  tertiaryMain: '#0288d1',
  tertiaryContrastText: '#ffffff',

  backgroundDefault: '#f5f5f5',

  // Fondo general de la app (body)
  layoutBackground: '#d0d3d4',

  textPrimary: '#0c315e',
  textSecondary: '#009640',

};

// Extrae colores desde setup_config.json
function getColorsFromConfig() {
  try {
    const colorsTheme = setupConfig?.paramsHtml?.colorsTheme;
    if (!colorsTheme) return {};

    const {
      primaryMain,
      primaryContrastText,
      secondaryMain,
      secondaryContrastText,
      tertiaryMain,
      tertiaryContrastText,
      textPrimary,
      textSecondary,
      backgroundDefault,
      layoutBackground,
      theme, // "light" | "dark"
    } = colorsTheme;

    return {
      primaryMain,
      primaryContrastText,
      secondaryMain,
      secondaryContrastText,
      tertiaryMain,
      tertiaryContrastText,
      textPrimary,
      textSecondary,
      backgroundDefault,
      layoutBackground,
      mode: theme, // lo usamos para palette.mode
    };
  } catch {
    return {};
  }
}

// Mezcla: config sobre defaults
const CONFIG_COLORS = getColorsFromConfig();

export const COLORS = {
  ...DEFAULT_COLORS,
  ...(CONFIG_COLORS.primaryMain ? { primaryMain: CONFIG_COLORS.primaryMain } : {}),
  ...(CONFIG_COLORS.primaryContrastText
    ? { primaryContrastText: CONFIG_COLORS.primaryContrastText }
    : {}),
  ...(CONFIG_COLORS.secondaryMain ? { secondaryMain: CONFIG_COLORS.secondaryMain } : {}),
  ...(CONFIG_COLORS.secondaryContrastText
    ? { secondaryContrastText: CONFIG_COLORS.secondaryContrastText }
    : {}),
    ...(CONFIG_COLORS.tertiaryMain ? { tertiaryMain: CONFIG_COLORS.tertiaryMain } : {}),
  ...(CONFIG_COLORS.tertiaryContrastText
    ? { tertiaryContrastText: CONFIG_COLORS.tertiaryContrastText }
    : {}),
  ...(CONFIG_COLORS.textPrimary ? { textPrimary: CONFIG_COLORS.textPrimary } : {}),
  ...(CONFIG_COLORS.textPrimary
    ? { textPrimary: CONFIG_COLORS.textPrimary }
    : {}),
    ...(CONFIG_COLORS.textSecondary ? { textSecondary: CONFIG_COLORS.textSecondary } : {}),
  ...(CONFIG_COLORS.textSecondary
    ? { textSecondary: CONFIG_COLORS.textSecondary }
    : {}),
  ...(CONFIG_COLORS.backgroundDefault
    ? { backgroundDefault: CONFIG_COLORS.backgroundDefault }
    : {}),
  ...(CONFIG_COLORS.layoutBackground
    ? { layoutBackground: CONFIG_COLORS.layoutBackground }
    : {}),
};

export function createScaledTheme(rawFactor = 1) {
  const factor = Number.isFinite(rawFactor)
    ? Math.min(2, Math.max(0.75, rawFactor))
    : 1;

  const px = (n) => `${Math.round(n * factor)}px`;

  // Modo de color desde config (default light)
  const mode = CONFIG_COLORS.mode === 'dark' ? 'dark' : 'light';

  return createTheme({
    palette: {
      mode,
      background: {
        default: COLORS.backgroundDefault,
        paper: COLORS.backgroundDefault,
      },
      primary: {
        main: COLORS.primaryMain,
        contrastText: COLORS.primaryContrastText,
      },
      secondary: {
        main: COLORS.secondaryMain,
        contrastText: COLORS.secondaryContrastText,
      },
      tertiary: {
        main: COLORS.tertiaryMain,
        contrastText: COLORS.tertiaryContrastText,
      },
      text: {
        primary: COLORS.textPrimary,
        secondary: COLORS.textSecondary,
      }
    },

    spacing: (value) => 8 * factor * value,

    typography: {
      fontFamily: 'Nunito, sans-serif',
      fontSize: 14 * factor,

      h1: { fontSize: px(40), fontWeight: 700, lineHeight: 1.2 },
      h2: { fontSize: px(32), fontWeight: 600, lineHeight: 1.25 },
      h3: { fontSize: px(28), fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: px(24), fontWeight: 500, lineHeight: 1.3 },
      h5: { fontSize: px(20), fontWeight: 500, lineHeight: 1.35 },
      h6: { fontSize: px(18), fontWeight: 500, lineHeight: 1.4 },
      subtitle1: { fontSize: px(16), fontWeight: 400, lineHeight: 1.4 },
      subtitle2: { fontSize: px(14), fontWeight: 400, lineHeight: 1.4 },
      body1: { fontSize: px(16), fontWeight: 400, lineHeight: 1.45 },
      body2: { fontSize: px(14), fontWeight: 400, lineHeight: 1.4 },
      button: { fontSize: px(16), fontWeight: 600, textTransform: 'none' },
      caption: { fontSize: px(12), lineHeight: 1.3 },
      overline: { fontSize: px(12), textTransform: 'uppercase', letterSpacing: '0.1em' },
    },
    
    components: {
      // TEXTFIELDS
      MuiTextField: {
        defaultProps: {
          autoComplete: 'off',
          fullWidth: true,
          variant: 'standard',
          size: 'medium',
        },
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              color: COLORS.textPrimary,
              fontSize: px(24),
            },
            '& .MuiInputBase-input': {
              color: COLORS.primaryMain,
              fontSize: px(32),
              fontWeight: 'bold',
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: COLORS.textPrimary,
            fontSize: px(16),
            transform: 'translate(0, 18px) scale(1)',
            transition: 'all 0.2s ease-out',
            margin: 0,
            '&.MuiInputLabel-shrink': {
              transform: 'translate(0, 0) scale(0.8)',
            },
          },
        },
      },

      MuiInput: {
        styleOverrides: {
          root: {
            fontSize: px(16),
            paddingTop: px(3),
            paddingBottom: 0,
          },
          underline: {
            '&:before': { borderBottomColor: COLORS.textPrimary },
            '&:hover:not(.Mui-disabled):before': {
              borderBottomColor: COLORS.primaryMain,
            },
            '&:after': {
              borderBottomColor: COLORS.primaryMain,
              borderBottomWidth: px(2),
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: px(16),
            '& .MuiInputBase-input': {
              color: COLORS.primaryMain,
              fontSize: px(18),
              fontWeight: 'bold',
              '&::placeholder': {
                color: COLORS.textPrimary,
                opacity: 0.4,
                fontStyle: 'italic',
              },
            },
          },
          notchedOutline: { borderColor: COLORS.textPrimary },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: COLORS.primaryMain,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: COLORS.primaryMain,
            borderWidth: px(2),
          },
        },
      },

      MuiFilledInput: {
        styleOverrides: {
          root: {
            backgroundColor: '#fff',
            '& .MuiInputBase-input': {
              color: COLORS.primaryMain,
              fontSize: px(18),
              fontWeight: 'bold',
            },
            '&:before': { borderBottomColor: COLORS.textPrimary },
            '&:after': {
              borderBottomColor: COLORS.primaryMain,
              borderBottomWidth: px(2),
            },
            '&:hover:not(.Mui-disabled):before': {
              borderBottomColor: COLORS.primaryMain,
            },
          },
        },
      },

      MuiInputBase: {
        defaultProps: { autoComplete: 'off' },
        styleOverrides: {
          input: {
            color: COLORS.primaryMain,
            fontSize: px(18),
            fontWeight: 'bold',
            '&::placeholder': {
              color: COLORS.textPrimary,
              opacity: 0.4,
              fontStyle: 'italic',
            },
          },
          inputSizeSmall: {
            fontSize: px(16),
            fontWeight: 'bold',
          },
        },
      },

      // DATE PICKERS
      MuiPickersSectionList: {
        styleOverrides: {
          root: {
            fontSize: px(16),
            fontWeight: 'bold',
            color: COLORS.primaryMain,
          },
        },
      },
      MuiPickersInputBase: {
        styleOverrides: {
          sectionContent: {
            fontSize: px(16),
            fontWeight: 'bold',
            color: COLORS.primaryMain,
          },
          sectionSeparator: {
            fontSize: px(18),
            fontWeight: 'bold',
            color: COLORS.primaryMain,
          },
        },
      },
      MuiDateTimePicker: {
        defaultProps: {
          slotProps: {
            textField: {
              variant: 'standard',
              fullWidth: true,
              size: 'medium',
            },
          },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginTop: 0,
            fontSize: px(12),
            lineHeight: 1.2,
          },
        },
      },

      // PAPERS
      MuiPaper: {
        defaultProps: { elevation: 3 },
        styleOverrides: {
          root: {
            borderRadius: 16 * factor,
            boxShadow: `0 ${px(8)} ${px(16)} rgba(0,0,0,0.25)`,
          },
        },
      },

      // BUTTONS
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: px(24),
            borderRadius: px(16),
            backdropFilter: 'blur(4px)',
            boxShadow: `0 ${px(4)} ${px(12)} rgba(0,0,0,0.2)`,
            padding: `${px(8)} ${px(16)}`,
            textTransform: 'none',
            fontWeight: 'bold',
            '&:hover': {
              outline: `${Math.max(1, Math.round(2 * factor))}px solid ${COLORS.layoutBackground}`,
              outlineOffset: 0,
            },
          },
        },
      },

      // APPBAR
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: COLORS.secondaryMain,
            color: COLORS.secondaryContrastText,
            borderRadius: 0,
            boxShadow: 'none',
          },
        },
      },

      // MENÚS
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 6 * factor,
            boxShadow: `0 ${px(4)} ${px(12)} rgba(0,0,0,0.15)`,
            minWidth: 200 * factor,
            padding: `${px(4)} 0`,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            padding: `${px(8)} ${px(12)}`,
            display: 'flex',
            alignItems: 'center',
            gap: px(6),
            fontSize: px(16),
            '&:hover': {
              backgroundColor: COLORS.secondaryMain,
              color: COLORS.primaryContrastText,
              '& .MuiSvgIcon-root': { color: COLORS.primaryContrastText },
            },
            '&.Mui-selected': {
              backgroundColor: COLORS.secondaryMain,
              color: COLORS.primaryContrastText,
              '& .MuiSvgIcon-root': { color: COLORS.primaryContrastText },
              '&:hover': { backgroundColor: COLORS.secondaryMain },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: COLORS.secondaryMain,
            '& .MuiSvgIcon-root': {
              fontSize: 28 * factor,
              transition: 'color 0.2s ease',
            },
          },
        },
      },

      // TABS
      MuiTabs: {
        styleOverrides: {
          root: { backgroundColor: COLORS.secondaryMain },
          indicator: { backgroundColor: COLORS.primaryMain },
          flexContainer: {
            borderBottom: 'none',
            '& .MuiTab-root': { borderRight: 'none' },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            border: 'none !important',
            fontWeight: 'bold',
            color: COLORS.secondaryMain,
            backgroundColor: COLORS.layoutBackground,
            fontSize: px(16),
            '&.Mui-selected': {
              color: COLORS.primaryMain,
              backgroundColor: COLORS.layoutBackground,
              fontWeight: 'bold',
            },
            '&:hover': { backgroundColor: COLORS.layoutBackground },
            '&::before, &::after': { display: 'none' },
          },
        },
      },

      // TABLAS
      MuiTablePagination: {
        styleOverrides: {
          root: { backgroundColor: COLORS.backgroundDefault, color: COLORS.textPrimary },
          toolbar: { minHeight: px(40) },
          selectIcon: { color: COLORS.textPrimary },
          actions: { color: COLORS.textPrimary },
          displayedRows: { fontSize: px(14), color: COLORS.textPrimary },
          selectLabel: { fontSize: px(14), color: COLORS.textPrimary },
          select: { fontSize: px(14), color: COLORS.textPrimary },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: COLORS.secondaryMain,
            color: COLORS.primaryContrastText,
            fontSize: px(14),
          },
          body: {
            fontSize: px(14),
            color: '#444',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(odd)': { backgroundColor: COLORS.layoutBackground },
            '&:hover': { backgroundColor: COLORS.layoutBackground },
          },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            color: COLORS.primaryContrastText,
            '&:hover': { color: COLORS.primaryContrastText },
            '&.Mui-active': { color: COLORS.primaryContrastText },
            '& .MuiTableSortLabel-icon': {
              color: `${COLORS.primaryContrastText} !important`,
            },
          },
        },
      },

      // DATE CALENDARS
      MuiPickersDay: {
        styleOverrides: { root: { fontSize: px(14) } },
      },
      MuiMonthCalendar: {
        styleOverrides: {
          root: {
            '& .MuiMonthCalendar-button': {
              fontSize: px(14),
              textTransform: 'capitalize',
            },
          },
        },
      },
      MuiYearCalendar: {
        styleOverrides: {
          root: {
            '& .MuiYearCalendar-yearButton': {
              fontSize: px(16),
              fontWeight: 'bold',
            },
          },
        },
      },
      MuiDayCalendar: {
        styleOverrides: {
          weekDayLabel: { fontSize: px(14) },
        },
      },

      // GLOBAL
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: COLORS.layoutBackground,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            minHeight: '100vh',
            maxWidth: '100%',
            overflow: 'hidden',
          },
          '.hg-button': {
            fontSize: px(18),
            fontWeight: 'bold',
            minHeight: px(56),
            border: `${Math.max(1, Math.round(1 * factor))}px solid ${COLORS.secondaryMain}`,
          },
        },
      },
    },
  });
}
