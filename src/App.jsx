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
import { AuthProvider, useAuth } from './AuthContext';
import { ConfirmationProvider } from './ConfirmationContext';

function AppWithAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  return <AppContent />;
}

function AppContent() {
  const { isTransitioning } = useLanguage();
  const location = useLocation();

  return (
    <div
      className="min-h-screen w-full max-w-full bg-background text-foreground transition-colors duration-300 overflow-x-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="w-full"
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
              <ConfirmationProvider>
                <ThemeProvider>
                  <BrowserRouter>
                    <AppWithAuth />
                  </BrowserRouter>
                </ThemeProvider>
              </ConfirmationProvider>
            </LanguageProvider>
          </AuthProvider>
        </SearchProvider>
      </LocationsProvider>
    </ErrorBoundary>
  );
}

export default App;