import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function BackButton({ onClick, title }) {
  const { isRtl } = useLanguage();
  const Icon = isRtl ? ChevronRight : ChevronLeft;

  return (
    <button
      onClick={onClick}
      className="group w-10 h-10 flex items-center justify-center rounded-2xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/90 dark:hover:bg-slate-700/70 active:scale-90 active:bg-slate-200 dark:active:bg-slate-700 transition-all duration-150 shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06] select-none touch-manipulation"
      title={title}
      type="button"
    >
      <Icon
        size={22}
        strokeWidth={2.5}
        className="transition-transform duration-150 group-active:scale-90"
      />
    </button>
  );
}
