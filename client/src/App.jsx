import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';

// Create a client
const queryClient = new QueryClient();

// Pages
import Dashboard from './pages/Dashboard';

// Placeholder Pages
const LogsPlaceholder = () => <h1 className="text-3xl font-bold">Data Logs (Coming Soon)</h1>;
const Settings = () => <h1 className="text-3xl font-bold">Settings</h1>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="solar-meter-theme">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="logs" element={<LogsPlaceholder />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
