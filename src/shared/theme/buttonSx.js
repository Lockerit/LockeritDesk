// shared/theme/buttonSx.js

export const dialogCtaButtonSx = (theme) => ({
  fontSize: {
    xs: theme.typography.h6.fontSize,
    sm: theme.typography.h5.fontSize,
    md: theme.typography.h4.fontSize,
  },
  p: {
    xs: theme.spacing(1),
    sm: theme.spacing(1.5),
    md: theme.spacing(2),
  },
  borderRadius: {
    xs: theme.spacing(1.5),
    sm: theme.spacing(2),
    md: theme.spacing(2.5),
  },
  minHeight: {
    xs: theme.spacing(6),
    sm: theme.spacing(7),
    md: theme.spacing(8),
  },
});

export const adminActionButtonSx = (theme) => ({
  fontSize: {
    xs: theme.typography.body1.fontSize,
    sm: theme.typography.h6.fontSize,
    md: theme.typography.h6.fontSize,
  },
  fontWeight: 600,
  textTransform: 'none',
  borderRadius: {
    xs: theme.spacing(1.25),
    sm: theme.spacing(1.5),
    md: theme.spacing(2),
  },
  px: {
    xs: theme.spacing(2),
    sm: theme.spacing(2.5),
    md: theme.spacing(3),
  },
  py: {
    xs: theme.spacing(1),
    sm: theme.spacing(1.25),
    md: theme.spacing(1.5),
  },
  minHeight: {
    xs: theme.spacing(5.5),
    sm: theme.spacing(6),
    md: theme.spacing(6.5),
  },
  whiteSpace: 'nowrap',
  '& .MuiButton-endIcon': {
    marginLeft: theme.spacing(1),
  },
  '& .MuiButton-endIcon svg': {
    fontSize: '1.2em',
  },
});

export const operationActionButtonSx = (theme, color) => {
  const borderColor =
    theme.palette?.[color]?.contrastText ||
    theme.palette.common.white;

  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    textTransform: 'none',
    fontSize: {
      xs: theme.typography.h3.fontSize,
      sm: theme.typography.h2.fontSize,
      md: theme.typography.h1.fontSize,
    },
    p: {
      xs: theme.spacing(1),
      sm: theme.spacing(1.5),
      md: theme.spacing(2),
    },
    border: `${theme.spacing(0.25)} solid ${borderColor}`,
    boxSizing: 'border-box',
    borderRadius: {
      xs: theme.spacing(2),
      sm: theme.spacing(2.5),
      md: theme.spacing(3),
    },
    minHeight: {
      xs: theme.spacing(10),
      sm: theme.spacing(12),
      md: theme.spacing(14),
    },
  };
};

export const keypadButtonSx = (theme) => ({
  width: '100%',
  height: '100%',
  fontSize: {
    xs: theme.typography.h1.fontSize,
    sm: theme.typography.h1.fontSize,
    md: theme.typography.h1.fontSize,
  },
  border: `2px solid ${theme.palette.tertiary?.main || theme.palette.divider}`,
  boxSizing: 'border-box',
  borderRadius: {
    xs: theme.spacing(1),
    sm: theme.spacing(1.25),
    md: theme.spacing(1.5),
  },
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
});

export const lockerGridButtonSx = (theme) => ({
  width: '100%',
  height: '100%',
  minHeight: {
    xs: theme.spacing(6.5),
    sm: theme.spacing(7),
    md: theme.spacing(7.5),
  },
  fontSize: {
    xs: theme.typography.h6.fontSize,
    sm: theme.typography.h5.fontSize,
  },
  lineHeight: 1,
  borderRadius: {
    xs: theme.spacing(1),
    sm: theme.spacing(1.25),
    md: theme.spacing(1.5),
  },
  boxShadow: 'none',
});
