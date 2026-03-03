import { forwardRef } from 'react';
import { X } from 'lucide-react';

const Panel = forwardRef(function Panel(
  { id, title, icon: Icon, onClose, children, className = '', headerRight, isFirst },
  ref
) {
  return (
    <div
      ref={ref}
      data-panel-id={id}
      className={`h-full flex flex-col bg-card border-border overflow-hidden ${
        isFirst ? '' : 'border-l'
      } ${className}`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 glass border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {Icon && <Icon size={16} className="text-muted-foreground shrink-0" strokeWidth={1.8} />}
          <h2 className="text-[14px] font-semibold text-foreground truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
              aria-label="Close panel"
            >
              <X size={15} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {children}
      </div>
    </div>
  );
});

export default Panel;
