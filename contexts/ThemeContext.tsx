
import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

export type ThemeColor = 'red' | 'blue' | 'green' | 'violet' | 'orange' | 'kawaGreen' | 'suzukiYellow' | 'gulfBlue' | 'vintageGreen' | 'NPCHudTheme' | 'NPCFutureTheme';

interface ThemeContextType {
    themeColor: ThemeColor;
    setThemeColor: (color: ThemeColor) => void;
    isHighContrast: boolean;
    setIsHighContrast: (enabled: boolean) => void;
    isDarkMode: boolean;
    setIsDarkMode: (enabled: boolean) => void;
}

export const colorPalettes: Record<ThemeColor, Record<string, string>> = {
    red: {
        '50': '254 242 242', '100': '254 226 226', '200': '254 202 202', '300': '252 165 165', '400': '248 113 113',
        '500': '239 68 68', '600': '220 38 38', '700': '185 28 28', '800': '153 27 27', '900': '127 29 29', '950': '69 10 10'
    },
    blue: {
        '50': '239 246 255', '100': '219 234 254', '200': '191 219 254', '300': '147 197 253', '400': '96 165 250',
        '500': '59 130 246', '600': '37 99 235', '700': '29 78 216', '800': '30 64 175', '900': '30 58 138', '950': '23 37 84'
    },
    green: {
        '50': '240 253 244', '100': '220 252 231', '200': '187 247 208', '300': '134 239 172', '400': '74 222 128',
        '500': '34 197 94', '600': '22 163 74', '700': '21 128 61', '800': '22 101 52', '900': '20 83 45', '950': '5 46 22'
    },
    violet: {
        '50': '245 243 255', '100': '237 233 254', '200': '221 214 254', '300': '196 181 253', '400': '167 139 250',
        '500': '139 92 246', '600': '124 58 237', '700': '109 40 217', '800': '91 33 182', '900': '76 29 149', '950': '46 16 101'
    },
    orange: {
        '50': '255 247 237', '100': '255 237 213', '200': '254 215 170', '300': '253 186 116', '400': '251 146 60',
        '500': '249 115 22', '600': '234 88 12', '700': '194 65 12', '800': '154 52 18', '900': '12 45 18', '950': '67 20 7'
    },
    kawaGreen: {
        '50': '247 254 231', '100': '236 252 203', '200': '217 249 157', '300': '190 242 100', '400': '163 230 53',
        '500': '132 204 22', '600': '101 163 13', '700': '77 124 15', '800': '63 98 18', '900': '54 83 20', '950': '26 46 5'
    },
    suzukiYellow: {
        '50': '255 251 235', '100': '254 243 199', '200': '253 230 138', '300': '252 211 77', '400': '251 191 36',
        '500': '245 158 11', '600': '217 119 6', '700': '180 83 9', '800': '146 64 14', '900': '120 53 15', '950': '69 26 3'
    },
    gulfBlue: {
        '50': '240 249 255', '100': '224 242 254', '200': '186 230 253', '300': '125 211 252', '400': '56 189 248',
        '500': '14 165 233', '600': '2 132 199', '700': '3 105 161', '800': '7 89 133', '900': '12 74 110', '950': '8 47 73'
    },
    vintageGreen: {
      '50': '243 248 243', '100': '222 235 221', '200': '189 214 187', '300': '146 186 143', '400': '98 152 94',
      '500': '58 107 53', '600': '47 88 42', '700': '38 70 34', '800': '30 56 27', '900': '25 46 22', '950': '12 25 10'
    },
    NPCHudTheme: {
      '50': '236 254 255', '100': '207 250 254', '200': '165 243 252', '300': '103 232 249', '400': '34 211 238',
      '500': '6 182 212', '600': '8 145 178', '700': '14 116 144', '800': '21 94 117', '900': '22 78 99', '950': '8 51 68'
    },
    NPCFutureTheme: {
      '50': '245 243 255',
      '100': '237 233 254',
      '200': '221 214 254',
      '300': '196 181 253',
      '400': '167 139 250',
      '500': '139 92 246',  // Violet
      '600': '124 58 237',
      '700': '109 40 217',
      '800': '91 33 182',
      '900': '48 43 99',
      '950': '15 12 41'
    }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Changed default to NPCFutureTheme
    const [themeColor, setThemeColor] = useLocalStorage<ThemeColor>('themeColor', 'NPCFutureTheme');
    const [isHighContrast, setIsHighContrast] = useLocalStorage<boolean>('isHighContrast', false);
    const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('theme', 'dark');

    const isDarkMode = theme === 'dark';
    const setIsDarkMode = (enabled: boolean) => {
        setTheme(enabled ? 'dark' : 'light');
    };

    useEffect(() => {
        const root = document.documentElement;
        
        const currentPaletteKey = colorPalettes[themeColor] ? themeColor : 'NPCFutureTheme';
        const palette = colorPalettes[currentPaletteKey];
        
        for (const [shade, rgb] of Object.entries(palette)) {
            root.style.setProperty(`--color-primary-${shade}`, rgb);
        }

        document.body.classList.remove('theme-hud', 'theme-future');
        if (currentPaletteKey === 'NPCHudTheme') {
            document.body.classList.add('theme-hud');
        } else if (currentPaletteKey === 'NPCFutureTheme') {
            document.body.classList.add('theme-future');
        }

        if (isHighContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }

        if (isDarkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [themeColor, isHighContrast, isDarkMode]);

    const value = useMemo(() => ({
        themeColor,
        setThemeColor,
        isHighContrast,
        setIsHighContrast,
        isDarkMode,
        setIsDarkMode,
    }), [themeColor, isHighContrast, isDarkMode, setThemeColor, setIsHighContrast]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
