import { LinearProgress, Box, Typography } from '@mui/material';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';

export const Progressbar = ({ msg, amountPay }) => {
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    return (
        <Box sx={{ width: '100%', textAlign: 'center', mt: 2 * scale }}>
            <Box textAlign="center" sx={{ mb: 2 * scale }}>
                <Typography variant="h4" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                    {msg}{' '}
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