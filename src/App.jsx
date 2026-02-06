import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function AppContent() {
  const { isTransitioning, isRtl } = useLanguage();
  return (
    <BrowserRouter>
      <div
        className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 transition-opacity duration-200 ease-out ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        } ${isRtl ? 'rtl' : 'ltr'}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/locations/area/:areaKey" element={<LocationsView />} />
          <Route path="/locations" element={<LocationsView />} />
          <Route path="/customers/area/:areaKey" element={<CustomersView />} />
          <Route path="/customers" element={<CustomersView />} />
          <Route path="/add" element={<AddLocationView />} />
          <Route path="/location/:id" element={<LocationDetailsView />} />
          <Route path="/customer/:id" element={<CustomerDetailsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <LocationsProvider>
      <SearchProvider>
      <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
      </ThemeProvider>
      </SearchProvider>
    </LocationsProvider>
    </ErrorBoundary>
  );
}

export default App;