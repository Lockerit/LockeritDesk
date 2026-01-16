export const LEADING_ICON_CLASS = 'LockeritLeadingIcon';
export const TRAILING_ICON_CLASS = 'LockeritTrailingIcon';

export const leadingIconSx = () => ({
  color: 'primary.main',
  opacity: 1,
  transition: 'color 140ms ease',
});

export const trailingIconSx = () => ({
  color: 'primary.main',
  opacity: 1,
  transition: 'color 140ms ease',
});

export const focusIconRowSx = (_theme, options = {}) => {
  const { hasValue } = options;
  const restColor =
    typeof hasValue === 'boolean'
      ? hasValue
        ? 'primary.main'
        : 'secondary.main'
      : 'primary.main';

  return {
    '& .LockeritLeadingIcon, & .LockeritTrailingIcon': {
      color: restColor,
      opacity: 1,
      transition: 'color 140ms ease',
    },
    '&:focus-within .LockeritLeadingIcon, &:focus-within .LockeritTrailingIcon': {
      color: 'secondary.main',
      opacity: 1,
    },
  };
};
