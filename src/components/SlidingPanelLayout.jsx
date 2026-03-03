import { Children, cloneElement, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLLAPSED_STRIP_WIDTH = 40;

function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === 'undefined') return 'mobile';
    const w = window.innerWidth;
    if (w >= 1280) return 'desktop';
    if (w >= 768) return 'tablet';
    return 'mobile';
  });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w >= 1280) setBp('desktop');
      else if (w >= 768) setBp('tablet');
      else setBp('mobile');
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return bp;
}

const springTransition = { type: 'spring', stiffness: 400, damping: 35 };
const fastSpring = { type: 'spring', stiffness: 500, damping: 35 };

export default function SlidingPanelLayout({ children, onPanelTap }) {
  const bp = useBreakpoint();
  const containerRef = useRef(null);

  const panels = useMemo(() => {
    const arr = [];
    Children.forEach(children, (child) => {
      if (child) arr.push(child);
    });
    return arr;
  }, [children]);

  const panelCount = panels.length;
  const [activeMobileIndex, setActiveMobileIndex] = useState(panelCount - 1);

  useEffect(() => {
    setActiveMobileIndex(panelCount - 1);
  }, [panelCount]);

  const handleStripTap = useCallback(
    (index) => {
      setActiveMobileIndex(index);
      onPanelTap?.(index);
    },
    [onPanelTap]
  );

  if (panelCount === 0) return null;

  // Mobile + Tablet: one panel at a time, edge strips for previous
  if (bp === 'mobile' || bp === 'tablet') {
    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden flex">
        {panels.map((panel, index) => {
          const isActive = index === activeMobileIndex;
          const isBeforeActive = index < activeMobileIndex;
          const isAfterActive = index > activeMobileIndex;
          const panelId = panel.props?.id || `panel-${index}`;
          const panelTitle = panel.props?.title || '';
          const PanelIcon = panel.props?.icon;

          if (isAfterActive) return null;

          if (isBeforeActive) {
            return (
              <motion.div
                key={`strip-${panelId}`}
                className="shrink-0 h-full cursor-pointer bg-slate-50/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex flex-col items-center gap-1.5 relative overflow-hidden border-r border-slate-200/80 dark:border-slate-700/80"
                style={{ width: COLLAPSED_STRIP_WIDTH }}
                onClick={() => handleStripTap(index)}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: COLLAPSED_STRIP_WIDTH, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={fastSpring}
              >
                <div className="w-full h-1 bg-primary/60 shrink-0" />
                <div className="flex flex-col items-center pt-3 gap-2">
                  {PanelIcon && (
                    <PanelIcon size={14} className="text-primary/70 shrink-0" strokeWidth={2} />
                  )}
                  <span
                    className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {panelTitle}
                  </span>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`active-${panelId}`}
              className="flex-1 h-full min-w-0"
              initial={{ x: '100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={springTransition}
            >
              {cloneElement(panel, { isFirst: index === 0 })}
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Desktop (1280px+): show up to 2 panels side-by-side, rest as strips
  const maxVisible = 2;
  const visibleStart = Math.max(0, panelCount - maxVisible);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden flex">
      <AnimatePresence initial={false}>
        {panels.map((panel, index) => {
          const panelId = panel.props?.id || `panel-${index}`;
          const panelTitle = panel.props?.title || '';
          const PanelIcon = panel.props?.icon;
          const isCollapsed = index < visibleStart;

          if (isCollapsed) {
            return (
              <motion.div
                key={`strip-${panelId}`}
                className="shrink-0 h-full cursor-pointer bg-slate-50/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex flex-col items-center gap-1.5 relative overflow-hidden border-r border-slate-200/80 dark:border-slate-700/80"
                onClick={() => handleStripTap(index)}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: COLLAPSED_STRIP_WIDTH, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={fastSpring}
              >
                <div className="w-full h-1 bg-primary/60 shrink-0" />
                <div className="flex flex-col items-center pt-3 gap-2">
                  {PanelIcon && (
                    <PanelIcon size={14} className="text-primary/70 shrink-0" strokeWidth={2} />
                  )}
                  <span
                    className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {panelTitle}
                  </span>
                </div>
              </motion.div>
            );
          }

          const isFirstVisible = index === visibleStart;
          const isLastVisible = index === panelCount - 1;

          const widthStyle = isFirstVisible && !isLastVisible
            ? { width: 360, flexShrink: 0 }
            : { flex: '1 1 0%', minWidth: 320 };

          return (
            <motion.div
              key={`panel-${panelId}`}
              className="h-full overflow-hidden"
              style={widthStyle}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={springTransition}
            >
              {cloneElement(panel, { isFirst: index === 0 })}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
