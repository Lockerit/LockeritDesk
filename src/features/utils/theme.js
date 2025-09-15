import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import '@fontsource/nunito';

const fileName = 'theme';

// Función auxiliar de log
const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

export function createScaledTheme(factor = 1) {
  log('debug', `factor theme:  ${factor}`);
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
      fontSize: 12 * factor, // base para body

      h1: {
        fontSize: `${96 * factor}px`,
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: `${60 * factor}px`,
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: `${48 * factor}px`,
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: `${34 * factor}px`,
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: `${24 * factor}px`,
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: `${20 * factor}px`,
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: `${16 * factor}px`,
        fontWeight: 400,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: `${14 * factor}px`,
        fontWeight: 400,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: `${16 * factor}px`,
        fontWeight: 400,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: `${14 * factor}px`,
        fontWeight: 400,
        lineHeight: 1.4,
      },
      button: {
        fontSize: `${14 * factor}px`,
        fontWeight: 600,
        textTransform: 'none',
      },
      caption: {
        fontSize: `${12 * factor}px`,
        lineHeight: 1.4,
      },
      overline: {
        fontSize: `${12 * factor}px`,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
    },
    spacing: 8 * factor, // escala global de espaciado
    components: {
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
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "#0c315e",
            fontSize: `${20 * factor}px`,
            transform: `translate(0, 20px) scale(1)`,
            transition: "all 0.2s ease-out",
            margin: 0,
            "&.MuiInputLabel-shrink": {
              transform: `translate(0, 0) scale(0.75)`,
            },
          },
        },
      },

      // 🔹 variant="standard"
      MuiInput: {
        styleOverrides: {
          root: {
            fontSize: `${18 * factor}px`,
            paddingTop: `${3 * factor}px`,
            paddingBottom: 0,
          },
          underline: {
            "&:before": {
              borderBottomColor: "#0c315e",
            },
            "&:hover:not(.Mui-disabled):before": {
              borderBottomColor: "#009640",
            },
            "&:after": {
              borderBottomColor: "#009640",
              borderBottomWidth: `${2 * factor}px`,
            },
          },
        },
      },

      // 🔹 variant="outlined"
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontSize: `${18 * factor}px`,
            "& .MuiInputBase-input": {
              color: "#009640",
              fontSize: `${32 * factor}px`,
              fontWeight: "bold",
              "&::placeholder": {
                color: "#0c315e",
                opacity: 0.3,
                fontStyle: "italic",
              },
            },
          },
          notchedOutline: {
            borderColor: "#0c315e",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#009640",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#009640",
            borderWidth: `${2 * factor}px`,
          },
        },
      },

      // 🔹 variant="filled"
      MuiFilledInput: {
        styleOverrides: {
          root: {
            backgroundColor: "#fff",
            "& .MuiInputBase-input": {
              color: "#009640",
              fontSize: `${32 * factor}px`,
              fontWeight: "bold",
            },
            "&:before": {
              borderBottomColor: "#0c315e",
            },
            "&:after": {
              borderBottomColor: "#009640",
              borderBottomWidth: `${2 * factor}px`,
            },
            "&:hover:not(.Mui-disabled):before": {
              borderBottomColor: "#009640",
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
          // 👇 cuando el input tenga la clase "inputSizeSmall", mantiene tu font-size
          inputSizeSmall: {
            fontSize: `${32 * factor}px`,
            fontWeight: 'bold',
          },
        },
        defaultProps: {
          autoComplete: 'off',
        },
      },
      // (Opcional) si quieres asegurar el label también para todos los TextField
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              color: '#0c315e',
              fontSize: `${28 * factor}px`
            },
            '& .MuiInputBase-input': {
              color: '#009640',
              fontSize: `${32 * factor}px`,
              fontWeight: 'bold',
            },
          },
        },
        defaultProps: {
          autoComplete: 'off',
          fullWidth: true,
          variant: 'standard',
          size: 'medium', // evita small por defecto
        },
      },
      MuiPickersSectionList: {
        styleOverrides: {
          root: {
            fontSize: `${24 * factor}px`,
            fontWeight: "bold",
            color: "#009640",
            "& .MuiPickersSectionList-sectionContent": {
              fontSize: `${24 * factor}px`,
              fontWeight: "bold",
              color: "#009640",
            },
          },
        },
      },
      MuiPickersInputBase: {
        styleOverrides: {
          sectionContent: {
            fontSize: `${24 * factor}px`,
            fontWeight: "bold",
            color: "#009640",
          },
          sectionSeparator: {
            fontSize: `${28 * factor}px`,
            fontWeight: "bold",
            color: "#009640",
          },
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
            boxShadow: `0 ${12 * factor}px ${24 * factor}px rgba(0,0,0,0.5)`,
          },
        },
        defaultProps: {
          elevation: 3, // aplica tu sombra escalada
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: `${32 * factor}px`,
            borderRadius: `${16 * factor}px`,
            backdropFilter: 'blur(8px)',
            boxShadow: `0 ${8 * factor}px ${24 * factor}px rgba(0,0,0,0.2)`,
            padding: `${12 * factor}px ${24 * factor}px`,
            textTransform: 'none',
            fontWeight: 'bold',
            '&:hover': {
              border: `${5 * factor}px solid #d0d3d4`,
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
            borderRadius: 6 * factor,
            boxShadow: `0 ${4 * factor}px ${20 * factor}px rgba(0, 0, 0, 0.1)`,
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
            gap: `${6 * factor}px`,
            fontSize: `${24 * factor}px`,
            '&:hover': {
              backgroundColor: '#0c315e',
              color: '#fff',
              transition: 'color 0.2s ease',
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
            color: '#0c315e',
            '& .MuiSvgIcon-root': {
              fontSize: 40 * factor,
              transition: 'color 0.2s ease',
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            border: "none !important", // quita los bordes
            fontWeight: "bold",
            color: "#0c315e",
            backgroundColor: "#d0d3d4",
            fontSize: `${20 * factor}px`,
            "&.Mui-selected": {
              color: "#009640",
              backgroundColor: "#d0d3d4",
              fontWeight: "bold",
            },

            "&:hover": {
              backgroundColor: "#d0d3d4",
            },

            // 👇 elimina pseudo-elementos que dibujan líneas
            "&::before, &::after": {
              display: "none",
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            backgroundColor: "#0c315e", // fondo de la barra
          },
          indicator: {
            backgroundColor: "#009640", // línea verde de selección
          },
          flexContainer: {
            borderBottom: "none", // elimina borde inferior del contenedor
            "& .MuiTab-root": {
              borderRight: "none", // elimina línea vertical entre tabs
            },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            backgroundColor: "#f5f5f5", //color de fondo contenedor
            color: "#0c315e",
          },
          toolbar: {
            minHeight: `${48 * factor}px`,
          },
          selectIcon: {
            color: "#0c315e", // icono del select
          },
          actions: {
            color: "#0c315e", // flechas
          },
          displayedRows: {
            fontSize: `${20 * factor}px`,
            color: "#0c315e",
          },
          selectLabel: {
            fontSize: `${20 * factor}px`,
            color: "#0c315e",
          },
          select: {
            fontSize: `${20 * factor}px`,
            color: "#0c315e",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: "#0c315e", // fondo encabezado
            color: "#fff",              // texto encabezado
            fontSize: `${18 * factor}px`,
          },
          body: {
            fontSize: `${20 * factor}px`,
            color: "#444",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:nth-of-type(odd)": {
              backgroundColor: "#f9f9f9", // filas alternadas
            },
            "&:hover": {
              backgroundColor: "#e6f2ff", // efecto hover
            },
          },
        },
      },
      MuiPickersDay: {
        styleOverrides: {
          root: {
            fontSize: `${20 * factor}px`,   // agranda el número de los días
          },
        },
      },
      MuiMonthCalendar: {
        styleOverrides: {
          root: {
            '& .MuiMonthCalendar-button': {
              fontSize: `${20 * factor}px`,
              textTransform: 'capitalize',
            },
          },
        },
      },
      // (opcional) si también quieres el tamaño de los años en la vista de años:
      MuiYearCalendar: {
        styleOverrides: {
          root: {
            '& .MuiYearCalendar-yearButton': {
              fontSize: `${22 * factor}px`,
              fontWeight: 'bold',
            },
          },
        },
      },
      MuiDayCalendar: {
        styleOverrides: {
          weekDayLabel: {
            fontSize: `${20 * factor}px`,   // agranda las etiquetas (L, M, X, J…)
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
          ".hg-button": {       // todos los botones de react-simple-keyboard
            fontSize: `${28 * factor}px`,   // tamaño de letra que quieras
            fontWeight: 'bold',
            minHeight: `${70 * factor}px`
          }
        },
      },
    }
  });

  // theme = responsiveFontSizes(theme);

  return theme;
}
