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
                    color="text.primary"
                    sx={{ fontWeight: 'bold' }}
                >
                    {msg}{' '}
                </Typography>
                <Typography
                    variant="h2"
                    component="span"
                    color="text.secondary"
                    sx={{ fontWeight: 'bold' }}
                >
                    {amountPay}
                </Typography>
            </Box>

            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: theme.spacing(1.25),
                    borderRadius: theme.spacing(0.75),
                    // fondo verde claro
                    backgroundColor: theme.palette.success.light,
                    // relleno verde oscuro
                    '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.success.dark,
                    },
                }}
            />
        </Box>
    );
};
