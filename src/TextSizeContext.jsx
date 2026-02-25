import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'myRouteTextSize';
const SIZES = {
  small: 11,
  regular: 16,
  large: 23,
};

const TextSizeContext = createContext();

function loadSize() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SIZES[saved] !== undefined) return saved;
  } catch {}
  return 'regular';
}

export function TextSizeProvider({ children }) {
  const [textSize, setTextSizeState] = useState(loadSize);

  useEffect(() => {
    document.documentElement.style.fontSize = `${SIZES[textSize]}px`;
    try { localStorage.setItem(STORAGE_KEY, textSize); } catch {}
  }, [textSize]);

  const setTextSize = (size) => {
    if (SIZES[size] !== undefined) setTextSizeState(size);
  };

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error('useTextSize must be used within TextSizeProvider');
  return ctx;
}
