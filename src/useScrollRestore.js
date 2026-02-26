import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'scrollPositions';

function getStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function setStore(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function useScrollRestore(scrollRef) {
  const location = useLocation();
  const { user } = useAuth();
  const prevPath = useRef(location.pathname);
  const uid = user?.uid || user?.email || 'anon';

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const key = `${uid}::${location.pathname}`;

    const saved = getStore()[key];
    if (typeof saved === 'number') {
      requestAnimationFrame(() => { el.scrollTop = saved; });
    } else {
      el.scrollTop = 0;
    }

    prevPath.current = location.pathname;
  }, [location.pathname, uid]);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const key = `${uid}::${location.pathname}`;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const store = getStore();
          store[key] = el.scrollTop;
          setStore(store);
          ticking = false;
        });
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [location.pathname, uid]);
}
