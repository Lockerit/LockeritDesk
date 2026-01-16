import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import '../../../styles/VirtualKeyboard.css';

export const VirtualKeyboard = ({ inputValue, onChange, onEnter, activeField }) => {
    const keyboardRef = useRef(null);
    const [layoutName, setLayoutName] = useState('default'); // 🔹 estado para shift/lock
    const theme = useTheme();

    useEffect(() => {
        if (keyboardRef.current) keyboardRef.current.setInput(inputValue);
    }, [inputValue]);

    const onKeyPress = (button) => {
        if (button === '{shift}' || button === '{lock}') {
            const newLayout = layoutName === 'default' ? 'shift' : 'default';
            setLayoutName(newLayout);
            keyboardRef.current.setOptions({ layoutName: newLayout });
        }

        if (button === '{enter}') {
            const form = activeField?.inputRef?.current?.closest("form");

            if (form) {
                // Cierra el teclado primero
                if (typeof onEnter === "function") onEnter();

                // Dispara el submit nativo
                form.requestSubmit();
            }
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                // Variables para el CSS del teclado (solo tokens del theme)
                '--vk-bg': theme.palette.background.paper,
                '--vk-border': theme.palette.divider,
                '--vk-shadow': theme.shadows[1],
                '--vk-radius': `${theme.shape.borderRadius * 2}px`,
                '--vk-pad': { xs: theme.spacing(1), sm: theme.spacing(1.5) },
                '--vk-pad-xs': theme.spacing(1),
                '--vk-gap-row': { xs: theme.spacing(0.75), sm: theme.spacing(1) },
                '--vk-gap-row-xs': theme.spacing(0.75),
                '--vk-gap-key': { xs: theme.spacing(0.75), sm: theme.spacing(1) },
                '--vk-gap-key-xs': theme.spacing(0.75),
                '--vk-font': { xs: theme.typography.pxToRem(16), sm: theme.typography.pxToRem(18) },
                '--vk-font-xs': theme.typography.pxToRem(16),
                '--vk-key-h': { xs: theme.spacing(6), sm: `clamp(${theme.spacing(5.5)}, 7vh, ${theme.spacing(7)})` },
                '--vk-key-h-xs': theme.spacing(6),
                '--vk-key-w': { xs: theme.spacing(4.75), sm: theme.spacing(5.5) },
                '--vk-key-radius': { xs: `${theme.shape.borderRadius * 1.75}px`, sm: `${theme.shape.borderRadius * 2}px` },
                '--vk-key-radius-xs': `${theme.shape.borderRadius * 1.75}px`,
                '--vk-key-bg': alpha(theme.palette.action.active, 0.04),
                '--vk-key-bg-hover': alpha(theme.palette.action.active, 0.06),
                '--vk-key-bg-active': alpha(theme.palette.action.active, 0.10),
                '--vk-key-border': alpha(theme.palette.text.primary, 0.10),
                '--vk-key-color': theme.palette.text.primary,
                '--vk-fn-bg': alpha(theme.palette.secondary.main, 0.10),
                '--vk-fn-bg-hover': alpha(theme.palette.secondary.main, 0.14),
                '--vk-fn-bg-active': alpha(theme.palette.secondary.main, 0.18),
                '--vk-fn-border': alpha(theme.palette.secondary.main, 0.22),
                '--vk-fn-color': theme.palette.text.primary,
                '--vk-enter-bg': alpha(theme.palette.primary.main, 0.12),
                '--vk-enter-bg-hover': alpha(theme.palette.primary.main, 0.16),
                '--vk-enter-bg-active': alpha(theme.palette.primary.main, 0.20),
                '--vk-enter-border': alpha(theme.palette.primary.main, 0.28),
                '--vk-space-min': { xs: theme.spacing(14), sm: theme.spacing(18) },
            }}
        >
            <Keyboard
                keyboardRef={(r) => (keyboardRef.current = r)}
                layoutName={layoutName}
                theme="hg-theme-default vk-modern"
                buttonTheme={[
                    {
                        class: 'vk-fn',
                        buttons: '{bksp} {tab} {shift} {lock}',
                    },
                    {
                        class: 'vk-enter vk-fn',
                        buttons: '{enter}',
                    },
                    {
                        class: 'vk-space',
                        buttons: '{space}',
                    },
                ]}
                layout={{
                    default: [
                        '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
                        '{tab} q w e r t y u i o p [ ] \\\\',
                        "{lock} a s d f g h j k l ñ ; ' {enter}",
                        '{shift} z x c v b n m , . / {shift}',
                        '.com @ {space}',
                    ],
                    shift: [
                        '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
                        '{tab} Q W E R T Y U I O P { } |',
                        '{lock} A S D F G H J K L Ñ : " {enter}',
                        '{shift} Z X C V B N M < > ? {shift}',
                        '.com @ {space}',
                    ],
                }}
                onChange={onChange}
                onKeyPress={onKeyPress}
                input={inputValue}
            />
        </Box>
    );
}
