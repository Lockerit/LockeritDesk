import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import '@fontsource/nunito';

export function createScaledTheme(factor = 1) {
  let theme = createTheme({
    palette: {
      mode: 'light',
      background: {
        default: '#f5f5f5',
        paper: '#f5f5f5',
      },
      primary: {
        main: '#009640',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#0c315e',
        contrastText: '#ffffff'
      },
      text: {
        primary: '#0c315e',
        secondary: '#009640',
      },
    },
    typography: {
      fontFamily: 'Nunito, sans-serif',
      fontSize: 14 * factor, // tamaño base escalado
    },
    spacing: 8 * factor, // escala global de espaciado
    components: {
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: '#0c315e',
            fontSize: `${20 * factor}px`,
            transform: 'translate(0, 20px) scale(1)',
            transition: 'all 0.2s ease-out',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(0, -6px) scale(0.75)',
            },
          },
        },
      },
      MuiInput: {
        styleOverrides: {
          root: {
            fontSize: `${18 * factor}px`,
            paddingTop: `${3 * factor}px`,
            paddingBottom: 0,
          },
          underline: {
            '&:before': {
              borderBottomColor: '#0c315e',
            },
            '&:hover:not(.Mui-disabled):before': {
              borderBottomColor: '#009640',
            },
            '&:after': {
              borderBottomColor: '#0c315e',
              borderBottomWidth: `${5 * factor}px`,
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            color: '#009640',
            fontSize: `${32 * factor}px`,
            fontWeight: 'bold',
            '&::placeholder': {
              color: '#0c315e',
              opacity: 0.3,
              fontStyle: 'italic',
            },
          },
        },
        defaultProps: {
          autoComplete: 'off',
        },
      },
      MuiTextField: {
        defaultProps: {
          autoComplete: 'off',
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginTop: 0,
            fontSize: `${18 * factor}px`,
            lineHeight: 1
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16 * factor,
            boxShadow: '0 12px 24px rgba(0,0,0,1)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: `${32 * factor}px`,
            borderRadius: `${16 * factor}px`,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            padding: `${12 * factor}px ${24 * factor}px`,
            textTransform: 'none',
            fontWeight: 'bold',
            '&:hover': {
              border: '3px solid #0c315e',
              background: 'rgba(12,49,94,0.1)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              color: '#1b2631'
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: 'rgba(12,49,94,0.1)',
            color: '#0c315e',
            borderRadius: 0,
            boxShadow: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12 * factor,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            minWidth: 200 * factor,
            padding: `${4 * factor}px 0`,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            padding: `${8 * factor}px ${16 * factor}px`,
            display: 'flex',
            alignItems: 'center',
            gap: `${12 * factor}px`,
            '&:hover': {
              backgroundColor: '#0c315e',
              color: '#fff',
              '& .MuiSvgIcon-root': {
                color: '#fff',
              },
            },
            '&.Mui-selected': {
              backgroundColor: '#0c315e',
              color: '#fff',
              '& .MuiSvgIcon-root': {
                color: '#fff',
              },
              '&:hover': {
                backgroundColor: '#0c315e',
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 'unset',
            color: '#555',
            '& .MuiSvgIcon-root': {
              fontSize: 20 * factor,
              transition: 'color 0.2s ease',
            },
          },
        },
      },
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
        },
      },
    }
  });

  theme = responsiveFontSizes(theme);

  return theme;
}
