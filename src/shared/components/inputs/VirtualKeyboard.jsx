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
                '--vk-pad': { xs: theme.spacing(0.75), sm: theme.spacing(1) },
                '--vk-pad-xs': theme.spacing(0.75),
                '--vk-gap-row': { xs: theme.spacing(0.35), sm: theme.spacing(0.35) },
                '--vk-gap-row-xs': theme.spacing(0.35),
                '--vk-gap-key': { xs: theme.spacing(0.4), sm: theme.spacing(0.4) },
                '--vk-gap-key-xs': theme.spacing(0.4),
                '--vk-font': { xs: theme.typography.pxToRem(17), sm: theme.typography.pxToRem(19) },
                '--vk-font-xs': theme.typography.pxToRem(17),
                '--vk-key-h': {
                    xs: theme.spacing(6.5),
                    sm: `clamp(${theme.spacing(6)}, 7.5vh, ${theme.spacing(7.5)})`,
                },
                '--vk-key-h-xs': theme.spacing(6.5),
                '--vk-key-w': { xs: theme.spacing(5.25), sm: theme.spacing(6.25) },
                '--vk-key-radius': { xs: `${theme.shape.borderRadius * 1.75}px`, sm: `${theme.shape.borderRadius * 2}px` },
                '--vk-key-radius-xs': `${theme.shape.borderRadius * 1.75}px`,
                '--vk-key-bg': alpha(theme.palette.action.active, 0.04),
                '--vk-key-bg-hover': alpha(theme.palette.action.active, 0.06),
                '--vk-key-bg-active': alpha(theme.palette.action.active, 0.10),
                '--vk-key-border': alpha(theme.palette.text.primary, 0.10),
                '--vk-key-color': theme.palette.text.primary,
                '--vk-fn-bg': alpha(theme.palette.secondary.main, 0.14),
                '--vk-fn-bg-hover': alpha(theme.palette.secondary.main, 0.18),
                '--vk-fn-bg-active': alpha(theme.palette.secondary.main, 0.22),
                '--vk-fn-border': alpha(theme.palette.secondary.main, 0.30),
                '--vk-fn-color': theme.palette.text.primary,
                '--vk-enter-bg': alpha(theme.palette.primary.main, 0.16),
                '--vk-enter-bg-hover': alpha(theme.palette.primary.main, 0.20),
                '--vk-enter-bg-active': alpha(theme.palette.primary.main, 0.24),
                '--vk-enter-border': alpha(theme.palette.primary.main, 0.34),
                '--vk-space-min': { xs: theme.spacing(16), sm: theme.spacing(22) },
            }}
        >
            <Keyboard
                keyboardRef={(r) => (keyboardRef.current = r)}
                layoutName={layoutName}
                theme="hg-theme-default vk-modern"
                buttonTheme={[
                    {
                        class: 'vk-fn vk-bksp',
                        buttons: '{bksp}',
                    },
                    {
                        class: 'vk-fn vk-tab',
                        buttons: '{tab}',
                    },
                    {
                        class: 'vk-fn vk-shift',
                        buttons: '{shift}',
                    },
                    {
                        class: 'vk-fn vk-caps',
                        buttons: '{lock}',
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
                display={{
                    '{bksp}': '⌫',
                    '{enter}': '⏎',
                    '{shift}': '⇧',
                    '{lock}': '⇪',
                    '{tab}': '⇥',
                    '{space}': ' ',
                }}
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
