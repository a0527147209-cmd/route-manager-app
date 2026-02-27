import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from './ErrorBoundary';
import { LocationsProvider } from './LocationsContext';
import { SearchProvider } from './SearchContext';
import { ThemeProvider } from './ThemeContext';
import { LanguageProvider, useLanguage } from './LanguageContext';

import HomeView from './HomeView';
import LocationsView from './LocationsView';
import CustomersView from './CustomersView';
import AddLocationView from './AddLocationView';
import LocationDetailsView from './LocationDetailsView';
import CustomerDetailsView from './CustomerDetailsView';
import SettingsView from './SettingsView';
import LoginView from './LoginView';
import MapsView from './MapsView';
import ManageUsersView from './ManageUsersView';
import ReportsView from './ReportsView';
import RecentActivityView from './RecentActivityView';
import TasksRemindersView from './TasksRemindersView';
import MapOverviewView from './MapOverviewView';
import NotificationsView from './NotificationsView';
import AccountView from './AccountView';
import { AuthProvider, useAuth } from './AuthContext';
import { ConfirmationProvider } from './ConfirmationContext';
import { TextSizeProvider } from './TextSizeContext';

import { useEffect } from 'react';

function AppWithAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
        <p className="text-lg font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user) return <LoginView />;
  return <AppContent />;
}

function AppContent() {
  const { isTransitioning } = useLanguage();
  const location = useLocation();

  // Scroll restoration is handled per-view by useScrollRestore hook

  return (
    <div
      className="h-full w-full max-w-full bg-background text-foreground transition-colors duration-300 flex flex-col overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="w-full h-full flex flex-col overflow-hidden"
        >
          <Routes location={location}>
            <Route path="/" element={<HomeView />} />
            <Route path="/locations/area/:areaKey" element={<LocationsView />} />
            <Route path="/locations" element={<LocationsView />} />
            <Route path="/customers/area/:areaKey" element={<CustomersView />} />
            <Route path="/customers" element={<CustomersView />} />
            <Route path="/add" element={<AddLocationView />} />
            <Route path="/location/:id" element={<LocationDetailsView />} />
            <Route path="/customer/:id" element={<CustomerDetailsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/maps" element={<MapsView />} />
            <Route path="/manage-users" element={<ManageUsersView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/recent-activity" element={<RecentActivityView />} />
            <Route path="/tasks" element={<TasksRemindersView />} />
            <Route path="/map-overview" element={<MapOverviewView />} />
            <Route path="/notifications" element={<NotificationsView />} />
            <Route path="/account" element={<AccountView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LocationsProvider>
        <SearchProvider>
          <AuthProvider>
            <LanguageProvider>
              <TextSizeProvider>
                <ConfirmationProvider>
                  <ThemeProvider>
                    <BrowserRouter>
                      <AppWithAuth />
                    </BrowserRouter>
                  </ThemeProvider>
                </ConfirmationProvider>
              </TextSizeProvider>
            </LanguageProvider>
          </AuthProvider>
        </SearchProvider>
      </LocationsProvider>
    </ErrorBoundary>
  );
}

export default App;