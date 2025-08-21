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
      MuiDateTimePicker: {
        defaultProps: {
          slotProps: {
            textField: {
              variant: 'standard',
              fullWidth: true,
              size: 'medium',        // 👈 evita que se aplique .MuiInputBase-inputSizeSmall
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "#0c315e",
            fontSize: `${20 * factor}px`,
            transform: "translate(0, 20px) scale(1)",
            transition: "all 0.2s ease-out",
            "&.MuiInputLabel-shrink": {
              transform: "translate(0, -6px) scale(0.75)",
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
              fontSize: `${20 * factor}px`,
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
          size: 'medium', // 👈 evita small por defecto
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
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 'bold',
            // color del texto normal
            color: '#0c315e',
            // background por defecto del tab
            backgroundColor: '#d0d3d4',
            // para que no se vean muy juntos
            minHeight: '48px',
            // cuando está seleccionado
            '&.Mui-selected': {
              color: '#009640',
              backgroundColor: '#d0d3d4',
              fontWeight: 'bold',
            },
            // al hacer hover
            '&:hover': {
              backgroundColor: '#d0d3d4',
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            backgroundColor: '#0c315e', // fondo de la barra que contiene los tabs
          },
          indicator: {
            backgroundColor: '#009640', // color del indicador debajo del tab
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
            fontSize: `${16 * factor}px`,
            color: "#0c315e",
          },
          selectLabel: {
            fontSize: `${16 * factor}px`,
            color: "#0c315e",
          },
          select: {
            fontSize: `${16 * factor}px`,
            color: "#0c315e",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: "#0c315e", // fondo encabezado
            color: "#fff",              // texto encabezado
            fontSize: `${15 * factor}px`,
          },
          body: {
            fontSize: `${18 * factor}px`,
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
            fontSize: `${18 * factor}px`,   // agranda el número de los días
          },
        },
      },
      MuiMonthCalendar: {
        styleOverrides: {
          root: {
            '& .MuiMonthCalendar-button': {
              fontSize: `${18 * factor}px`,
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
              fontSize: `${20 * factor}px`,
              fontWeight: 'bold',
            },
          },
        },
      },
      MuiDayCalendar: {
        styleOverrides: {
          weekDayLabel: {
            fontSize: `${16 * factor}px`,   // agranda las etiquetas (L, M, X, J…)
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
