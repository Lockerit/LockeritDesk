// shared/theme/theme.js
import { createTheme } from '@mui/material/styles';
import '@fontsource/nunito';

export function createScaledTheme(rawFactor = 1) {
  // Factor de escala normalizado (para pantallas pequeñas y grandes)
  const factor = Number.isFinite(rawFactor)
    ? Math.min(2, Math.max(0.75, rawFactor))
    : 1;

  // Helper para px
  const px = (n) => `${Math.round(n * factor)}px`;

  return createTheme({
    palette: {
      mode: 'light',
      background: { default: '#f5f5f5', paper: '#f5f5f5' },
      primary: { main: '#009640', contrastText: '#ffffff' },
      secondary: { main: '#0c315e', contrastText: '#ffffff' },
      text: { primary: '#0c315e', secondary: '#009640' },
      // Colores centralizados para estados de casilleros
      lockerStatus: {
        FREE: '#2e7d32',
        OCCUPIED: '#c62828',
        RESERVED: '#f9a825',
        BLOCKED: '#6d6d6d',
        MAINTENANCE: '#6a1b9a',
      },
    },

    // spacing(1) -> 8 * factor px
    spacing: (value) => 8 * factor * value,

    typography: {
      fontFamily: 'Nunito, sans-serif',
      fontSize: 14 * factor, // base

      // Tamaños más razonables para kiosko pero sin exagerar
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
              color: '#0c315e',
              fontSize: px(24),
            },
            '& .MuiInputBase-input': {
              color: '#009640',
              fontSize: px(32),
              fontWeight: 'bold',
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: '#0c315e',
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

      // variant="standard"
      MuiInput: {
        styleOverrides: {
          root: {
            fontSize: px(16),
            paddingTop: px(3),
            paddingBottom: 0,
          },
          underline: {
            '&:before': { borderBottomColor: '#0c315e' },
            '&:hover:not(.Mui-disabled):before': {
              borderBottomColor: '#009640',
            },
            '&:after': {
              borderBottomColor: '#009640',
              borderBottomWidth: px(2),
            },
          },
        },
      },

      // variant="outlined"
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: px(16),
            '& .MuiInputBase-input': {
              color: '#009640',
              fontSize: px(18),
              fontWeight: 'bold',
              '&::placeholder': {
                color: '#0c315e',
                opacity: 0.4,
                fontStyle: 'italic',
              },
            },
          },
          notchedOutline: { borderColor: '#0c315e' },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#009640',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#009640',
            borderWidth: px(2),
          },
        },
      },

      // variant="filled"
      MuiFilledInput: {
        styleOverrides: {
          root: {
            backgroundColor: '#fff',
            '& .MuiInputBase-input': {
              color: '#009640',
              fontSize: px(18),
              fontWeight: 'bold',
            },
            '&:before': { borderBottomColor: '#0c315e' },
            '&:after': {
              borderBottomColor: '#009640',
              borderBottomWidth: px(2),
            },
            '&:hover:not(.Mui-disabled):before': {
              borderBottomColor: '#009640',
            },
          },
        },
      },

      MuiInputBase: {
        defaultProps: { autoComplete: 'off' },
        styleOverrides: {
          input: {
            color: '#009640',
            fontSize: px(18),
            fontWeight: 'bold',
            '&::placeholder': {
              color: '#0c315e',
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
            color: '#009640',
          },
        },
      },
      MuiPickersInputBase: {
        styleOverrides: {
          sectionContent: {
            fontSize: px(16),
            fontWeight: 'bold',
            color: '#009640',
          },
          sectionSeparator: {
            fontSize: px(18),
            fontWeight: 'bold',
            color: '#009640',
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
              outline: `${Math.max(1, Math.round(2 * factor))}px solid #d0d3d4`,
              outlineOffset: 0,
            },
          },
        },
      },

      // APPBAR
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: 'rgba(12,49,94,0.9)',
            color: '#ffffff',
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
              backgroundColor: '#0c315e',
              color: '#fff',
              '& .MuiSvgIcon-root': { color: '#fff' },
            },
            '&.Mui-selected': {
              backgroundColor: '#0c315e',
              color: '#fff',
              '& .MuiSvgIcon-root': { color: '#fff' },
              '&:hover': { backgroundColor: '#0c315e' },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: '#0c315e',
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
          root: { backgroundColor: '#0c315e' },
          indicator: { backgroundColor: '#009640' },
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
            color: '#0c315e',
            backgroundColor: '#d0d3d4',
            fontSize: px(16),
            '&.Mui-selected': {
              color: '#009640',
              backgroundColor: '#d0d3d4',
              fontWeight: 'bold',
            },
            '&:hover': { backgroundColor: '#d0d3d4' },
            '&::before, &::after': { display: 'none' },
          },
        },
      },

      // TABLAS
      MuiTablePagination: {
        styleOverrides: {
          root: { backgroundColor: '#f5f5f5', color: '#0c315e' },
          toolbar: { minHeight: px(40) },
          selectIcon: { color: '#0c315e' },
          actions: { color: '#0c315e' },
          displayedRows: { fontSize: px(14), color: '#0c315e' },
          selectLabel: { fontSize: px(14), color: '#0c315e' },
          select: { fontSize: px(14), color: '#0c315e' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: '#0c315e',
            color: '#fff',
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
            '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
            '&:hover': { backgroundColor: '#e6f2ff' },
          },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            color: '#fff',
            '&:hover': { color: '#fff' },
            '&.Mui-active': { color: '#fff' },
            '& .MuiTableSortLabel-icon': {
              color: '#fff !important',
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
            backgroundColor: '#d0d3d4',
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
            border: `${Math.max(1, Math.round(1 * factor))}px solid #0c315e`,
          },
        },
      },
    },
  });
}
