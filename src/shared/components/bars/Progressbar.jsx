import { LinearProgress, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Convierte "$ 1.500" → 1500, "$ 0" → 0
const parseAmount = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const digits = String(value).replace(/[^\d-]/g, ''); // deja solo dígitos y signo
    const num = parseInt(digits, 10);
    return Number.isNaN(num) ? 0 : num;
};

export const Progressbar = ({ msg, amountPay, amountService }) => {
    const theme = useTheme();

    const pay = parseAmount(amountPay);
    const total = parseAmount(amountService);

    const progress = total > 0 ? Math.min(100, (pay / total) * 100) : 0;

    return (
        <Box
            sx={{
                width: '100%',
                textAlign: 'center',
                mt: theme.spacing(2),
            }}
        >
            <Box textAlign="center" sx={{ mb: theme.spacing(2) }}>
                <Typography
                    variant="h4"
                    component="span"
                    color="text.contrastText"
                    sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.4rem', md: '1.8rem' } }}
                >
                    {msg}{' '}
                </Typography>
                <Typography
                    variant="h2"
                    component="span"
                    color="text.secondary"
                    sx={{ fontWeight: 'bold', fontSize: { xs: '1.2rem', sm: '1.8rem', md: '2.8rem' } }}
                >
                    {amountPay}
                </Typography>
            </Box>

            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: { xs: '8px', sm: theme.spacing(1.25) },
                    borderRadius: theme.spacing(0.75),
                    backgroundColor: theme.palette.success.light,
                    '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.success.dark,
                    },
                }}
            />
        </Box>
    );
};
