import { LinearProgress, Box, Typography } from '@mui/material';

const fileName = 'progessbar';

export default function LoadingBar({ msg, amountPay }) {
    return (
        <Box sx={{ width: '100%', textAlign: 'center', mt: 2 }}>
            <Box textAlign="center" sx={{ mb: 2 }}>
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
                sx={{ height: 10, borderRadius: 5 }}
            />
        </Box>
    );
}