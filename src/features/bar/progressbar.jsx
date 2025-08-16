import { LinearProgress, Box, Typography } from '@mui/material';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla

const fileName = 'progessbar';

export default function LoadingBar({ msg, amountPay }) {
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    return (
        <Box sx={{ width: '100%', textAlign: 'center', mt: 2 * scale }}>
            <Box textAlign="center" sx={{ mb: 2 * scale }}>
                <Typography variant="h4" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                    Valor ingresado:{' '}
                </Typography>
                <Typography variant="h4" component="span" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    {amountPay}
                </Typography>
            </Box>
            <LinearProgress
                variant="indeterminate"
                value={amountPay}
                sx={{ height: 10 * scale, borderRadius: 5 * scale }}
            />
        </Box>
    );
}