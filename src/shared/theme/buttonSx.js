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
