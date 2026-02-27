import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Menu } from 'lucide-react';
import BackButton from './BackButton';
import { useLanguage } from './LanguageContext';
import { useLocations } from './LocationsContext';

export default function RecentActivityView() {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const { locations } = useLocations();

  const recentVisits = useMemo(() => {
    return locations
      .filter(loc => loc.lastVisited)
      .map(loc => ({
        id: loc.id,
        name: loc.name || loc.address || 'Unknown',
        address: loc.address || '',
        city: loc.city || loc.zone || '',
        date: loc.lastVisited,
        collection: loc.lastCollection,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [locations]);

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 py-3 flex items-center gap-3">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-[17px] font-semibold text-slate-800 dark:text-white tracking-tight flex-1 text-center">
            {t('recentActivity')}
          </h1>
          <div className="w-9 shrink-0" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-4 pt-4 pb-[calc(3rem+env(safe-area-inset-bottom))]">
          {recentVisits.length === 0 ? (
            <p className="text-[13px] text-slate-400 dark:text-slate-500 py-12 text-center">
              {t('noRecentActivity')}
            </p>
          ) : (
            <div className="space-y-2">
              {recentVisits.map((visit, i) => (
                <button
                  key={`${visit.id}-${i}`}
                  type="button"
                  onClick={() => navigate(`/customer/${visit.id}`)}
                  className="w-full flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.99] group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                    <Clock size={15} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                    <p className="text-[13px] font-medium text-slate-800 dark:text-white truncate">
                      {visit.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      {visit.date}
                      {visit.city && ` · ${visit.city}`}
                      {visit.collection && visit.collection !== '0' && ` · ${visit.collection} lbs`}
                    </p>
                  </div>
                  <ChevronRight size={15} className={`text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-cyan-500 transition-colors ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
