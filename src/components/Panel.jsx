import { forwardRef } from 'react';
import { ChevronLeft, X } from 'lucide-react';

const Panel = forwardRef(function Panel(
  { id, title, icon: Icon, onClose, children, className = '', headerRight, isFirst },
  ref
) {
  return (
    <div
      ref={ref}
      data-panel-id={id}
      className={`h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${
        isFirst ? '' : 'border-l border-slate-200/60 dark:border-slate-800/60'
      } ${className}`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-95 shrink-0"
              aria-label="Back"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          )}
          {Icon && <Icon size={15} className="text-primary/70 shrink-0" strokeWidth={2} />}
          <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none bg-slate-50/50 dark:bg-slate-950/50">
        {children}
      </div>
    </div>
  );
});

export default Panel;
