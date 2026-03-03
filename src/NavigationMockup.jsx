import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Users, MapPin, User, FileText, ChevronRight, Settings, BarChart3, Map } from 'lucide-react';
import { useLanguage } from './LanguageContext';

function Breadcrumb({ items, isRtl }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <nav
        className="flex items-center gap-0.5 px-4 py-2 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/50 dark:border-slate-700/50 min-w-max"
        aria-label="Breadcrumb"
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-0.5 shrink-0">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  className={`text-slate-300 dark:text-slate-600 mx-0.5 shrink-0 ${isRtl ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              )}
              <button
                onClick={item.onClick}
                disabled={isLast}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all text-[11px] font-medium ${
                  isLast
                    ? 'text-slate-800 dark:text-slate-100 font-semibold cursor-default'
                    : 'text-primary hover:text-primary/80 hover:bg-primary/5 active:bg-primary/10 cursor-pointer'
                }`}
              >
                {Icon && <Icon size={11} strokeWidth={2} className="shrink-0 opacity-70" />}
                <span className="truncate max-w-[100px]">{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function BottomNavBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="shrink-0 flex items-stretch bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/70 dark:border-slate-800/70"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 pt-2.5 transition-all duration-150 active:scale-95 relative ${
              isActive
                ? 'text-primary'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
            <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default function NavigationMockup() {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState('customers');
  const [currentScreen, setCurrentScreen] = useState('detail');

  const screens = {
    regions: {
      breadcrumbs: [
        { label: 'Home', icon: Home, onClick: () => setCurrentScreen('home') },
        { label: 'Customers', icon: Users },
      ],
    },
    list: {
      breadcrumbs: [
        { label: 'Home', icon: Home, onClick: () => setCurrentScreen('home') },
        { label: 'Customers', icon: Users, onClick: () => setCurrentScreen('regions') },
        { label: 'New Jersey', icon: MapPin },
      ],
    },
    detail: {
      breadcrumbs: [
        { label: 'Home', icon: Home, onClick: () => setCurrentScreen('home') },
        { label: 'Customers', icon: Users, onClick: () => setCurrentScreen('regions') },
        { label: 'New Jersey', icon: MapPin, onClick: () => setCurrentScreen('list') },
        { label: '262 Newark Ave', icon: User },
      ],
    },
    log: {
      breadcrumbs: [
        { label: 'Home', icon: Home, onClick: () => setCurrentScreen('home') },
        { label: 'Customers', icon: Users, onClick: () => setCurrentScreen('regions') },
        { label: 'New Jersey', icon: MapPin, onClick: () => setCurrentScreen('list') },
        { label: '262 Newark Ave', icon: User, onClick: () => setCurrentScreen('detail') },
        { label: 'Create Log', icon: FileText },
      ],
    },
  };

  const screen = screens[currentScreen] || screens.detail;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top header - matching existing app style */}
      <header
        className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 pt-2.5 pb-2">
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={() => navigate('/customers')}
              className="group w-10 h-10 flex items-center justify-center rounded-2xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/90 dark:hover:bg-slate-700/70 active:scale-90 transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06] shrink-0"
              title="Back to real app"
            >
              <Home size={18} strokeWidth={2} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                Navigation Mock-up
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Visual preview only</p>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Breadcrumb bar */}
      <Breadcrumb items={screen.breadcrumbs} isRtl={isRtl} />

      {/* Mock content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full p-4 space-y-4">

          {/* Screen selector */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Tap to preview breadcrumbs for each screen
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['regions', 'list', 'detail', 'log'].map((s) => (
                <button
                  key={s}
                  onClick={() => setCurrentScreen(s)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all active:scale-95 ${
                    currentScreen === s
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {s === 'regions' ? 'Regions' : s === 'list' ? 'Customer List' : s === 'detail' ? 'Customer Detail' : 'Create Log'}
                </button>
              ))}
            </div>
          </div>

          {/* Simulated page content */}
          {currentScreen === 'regions' && (
            <div className="space-y-2">
              {['Bronx', 'New Jersey', 'Queens', 'Staten Island'].map((region, i) => (
                <button
                  key={region}
                  onClick={() => setCurrentScreen('list')}
                  className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-all text-left ring-1 ring-black/[0.02] dark:ring-white/[0.04]"
                >
                  <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={1.8} />
                  <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 flex-1">{region}</span>
                  <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2.5 rounded-lg text-[12px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                    {[36, 91, 45, 18][i]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {currentScreen === 'list' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-800/60 overflow-hidden">
              {['262 Newark Ave (Deli)', '706 Communipaw Ave', '756 Communipaw Ave', '356 West Side Ave', '237 Martin Luther King dr'].map((name, i) => (
                <button
                  key={name}
                  onClick={() => setCurrentScreen('detail')}
                  className="w-full flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                >
                  <span className="text-[11px] font-bold text-slate-400 tabular-nums w-5 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate block">{name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">40% commission</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" strokeWidth={2} />
                </button>
              ))}
            </div>
          )}

          {currentScreen === 'detail' && (
            <div className="space-y-3">
              <div className="flex items-stretch gap-2.5">
                <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">262 Newark Ave (Deli)</h2>
                  <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400 mt-1">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-xs">262 Newark Ave (Deli)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 ms-5">Jersey city, NJ</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('log')}
                  className="shrink-0 px-4 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <FileText size={20} />
                  <span className="font-bold text-[11px]">Add Log</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">Customer Notes</label>
                <div className="p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-500 min-h-[60px]">
                  <p className="text-slate-800 dark:text-white text-xs">Owner/9178159292<br />recommend removing<br />put 50 every other collection</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 overflow-hidden">
                <h2 className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                  Log History
                </h2>
                <div className="p-3 text-center text-slate-400 text-xs italic">
                  (Log table would appear here)
                </div>
              </div>
            </div>
          )}

          {currentScreen === 'log' && (
            <div className="space-y-3">
              <div className="flex items-stretch gap-0 w-full rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500 overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center px-2 py-2.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">DATE</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">2 Mar</p>
                </div>
                <div className="w-px bg-slate-300 dark:bg-slate-500 self-stretch my-1.5" />
                <div className="flex-1 flex flex-col items-center justify-center px-2 py-2.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">COMMISSION</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">40%</p>
                </div>
                <div className="w-px bg-slate-300 dark:bg-slate-500 self-stretch my-1.5" />
                <div className="flex-1 flex flex-col items-center justify-center px-2 py-2.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">USER</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">mardi</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide block">Collection Amount</label>
                <input type="text" placeholder="0.00" className="w-full px-3 py-2.5 text-base font-semibold rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none" />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-2">Bills</label>
                <div className="grid grid-cols-5 gap-2">
                  {[50, 20, 10, 5, 1].map((bill) => (
                    <div key={bill} className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-500 mb-0.5">${bill}</span>
                      <div className="flex items-center gap-0.5">
                        <button className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-slate-500 hover:bg-red-100">−</button>
                        <span className="w-6 text-center text-base font-bold text-slate-900 dark:text-slate-100">0</span>
                        <button className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-slate-500 hover:bg-green-100">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm">
                <FileText size={18} />
                <span>Save Log</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
