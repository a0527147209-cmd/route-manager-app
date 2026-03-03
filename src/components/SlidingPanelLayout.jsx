import { Children, cloneElement, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOBILE_BREAKPOINT = 768;
const COLLAPSED_STRIP_WIDTH = 44;

const PANEL_WIDTHS_DESKTOP = [280, 320, 'flex', 380];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : true
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

const stripVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: COLLAPSED_STRIP_WIDTH, opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const mobileActiveVariants = {
  initial: { x: '100%', opacity: 0.6 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0.6 },
};

const desktopPanelVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

const springConfig = { type: 'spring', stiffness: 350, damping: 30 };

export default function SlidingPanelLayout({ children, onPanelTap }) {
  const isMobile = useIsMobile();
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
    setActiveMobileIndex(Math.min(panelCount - 1, Math.max(0, panelCount - 1)));
  }, [panelCount]);

  const handleStripTap = useCallback(
    (index) => {
      setActiveMobileIndex(index);
      onPanelTap?.(index);
    },
    [onPanelTap]
  );

  if (panelCount === 0) return null;

  if (isMobile) {
    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden flex">
        <AnimatePresence initial={false}>
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
                  key={panelId}
                  className="shrink-0 h-full cursor-pointer border-r border-slate-200/60 dark:border-slate-800/60 bg-muted/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex flex-col items-center justify-start pt-14 relative overflow-hidden"
                  variants={stripVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={springConfig}
                  onClick={() => handleStripTap(index)}
                >
                  {PanelIcon && (
                    <PanelIcon
                      size={14}
                      className="text-muted-foreground mb-2 shrink-0"
                      strokeWidth={2}
                    />
                  )}
                  <span
                    className="text-[10px] font-semibold text-muted-foreground tracking-wide whitespace-nowrap"
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                    }}
                  >
                    {panelTitle}
                  </span>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={panelId}
                className="flex-1 h-full min-w-0"
                variants={mobileActiveVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springConfig}
              >
                {cloneElement(panel, { isFirst: index === 0 })}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden flex">
      <AnimatePresence initial={false}>
        {panels.map((panel, index) => {
          const panelId = panel.props?.id || `panel-${index}`;
          const desktopWidth = PANEL_WIDTHS_DESKTOP[index];
          const isFlex = desktopWidth === 'flex' || index >= PANEL_WIDTHS_DESKTOP.length;

          const widthStyle = isFlex
            ? { flex: '1 1 0%', minWidth: 280 }
            : { width: desktopWidth, flexShrink: 0 };

          return (
            <motion.div
              key={panelId}
              className="h-full overflow-hidden"
              style={widthStyle}
              variants={desktopPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springConfig}
            >
              {cloneElement(panel, { isFirst: index === 0 })}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
