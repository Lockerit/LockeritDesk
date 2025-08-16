export function scaledWidth(values, scale) {
  const compute = (base, min, max) => {
    if (!base) return undefined;
    return `${Math.max(min ?? base, Math.min(max ?? base, base * scale))}%`;
  };

  return {
    xs: compute(values.xs?.base, values.xs?.min, values.xs?.max),
    sm: compute(values.sm?.base, values.sm?.min, values.sm?.max),
    md: compute(values.md?.base, values.md?.min, values.md?.max),
    lg: compute(values.lg?.base, values.lg?.min, values.lg?.max),
  };
}