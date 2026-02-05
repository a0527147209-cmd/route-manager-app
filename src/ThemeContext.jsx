import { createContext, useContext, useState, useLayoutEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Check system preference or localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('appTheme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply the class to the HTML element and sync theme-color meta (useLayoutEffect = before paint)
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    const meta = window.document.querySelector('meta[name="theme-color"]');
    if (isDarkMode) {
      root.classList.add('dark');
      if (meta) meta.setAttribute('content', '#0f172a');
      localStorage.setItem('appTheme', 'dark');
    } else {
      root.classList.remove('dark');
      if (meta) meta.setAttribute('content', '#f8fafc');
      localStorage.setItem('appTheme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}