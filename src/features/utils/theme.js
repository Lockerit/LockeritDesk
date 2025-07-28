import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import '@fontsource/nunito';

// Create a theme instance.
let theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f5f5f5', // fondo general
      paper: '#f5f5f5',   // fondo para Paper y Card
    },
    primary: {
      main: '#009640', // (verde)
      contrastText: '#ffffff' // color de texto sobre fondo primario
    },
    secondary: {
      main: '#0c315e', // (azul)
      contrastText: '#ffffff' // color de texto sobre fondo secundario
    },
    text: {
      primary: '#0c315e', // Texto general (azul)
      secondary: '#009640', // Texto secundario (verde)
    },
  },
  typography: {
    fontFamily: 'Nunito, sans-serif',
  },
  components: {

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#0c315e', // (azul)
          fontSize: '24px', // Texto del campo
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: {
          // Línea base
          '&:before': {
            borderBottomColor: '0c315e', // color inicial (azul)
          },
          // Hover
          '&:hover:not(.Mui-disabled):before': {
            borderBottomColor: '#009640', // color al pasar el mouse (verde)
          },
          // Focus (cuando está seleccionado)
          '&:after': {
            borderBottomColor: '#0c315e', // color al enfocar (verde)
          },
        },
        root: {
          '&.Mui-focused': {
            color: '#0c315e',
            background: '#e2e3e8',
            opacity: 0.3,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: '#009640', // texto en todos los inputs (verde)
          fontSize: '28px', // Texto del campo
          fontWeight: 'bold',
          '&::placeholder': {
            color: '#0c315e',  //  Color del placeholder (azul)
            opacity: 0.3,        //  Asegúrate de que sea visible
            fontStyle: 'italic', // (opcional)
          },
        },
        defaultProps: {
          autoComplete: 'off',
        },
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
          marginTop: '0px', // o '0px' si quieres eliminar el espacio
          fontSize: '18px', // opcional, para hacerlo más compacto
          lineHeight: 1   // opcional, más compacto aún
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16, // Cambia esto al valor que desees (por ejemplo: 8, 12, 24)
          boxShadow: '0 24px 48px rgba(0,0,0,1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '32px',
          borderRadius: '16px',
          backdropFilter: 'blur(8px)', // efecto glass
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          padding: '12px 24px',
          textTransform: 'none',
          fontWeight: 'bold',
          // border: '3px solid', // (azul)
          '&:hover': {
            border: '3px solid #0c315e', // (azul)
            background: 'rgba(12,49,94,0.1)', // (gris)
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            color: '#1b2631'
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(12,49,94,0.1)', // (gris)
          color: '#0c315e', // color de texto blanco
          borderRadius: '0 0 0 0', // bordes redondeados abajo
          boxShadow: 'none', // sin sombra
          backdropFilter: 'blur(5px)', // efecto glassmorphism opcional
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#d0d3d4', // aquí cambias el fondo del body (gris)
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

export default theme;