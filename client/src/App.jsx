import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';// Pages
import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import DataLogs from './pages/DataLogs';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="solar-theme">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="sites" element={<Sites />} />
              <Route path="logs" element={<DataLogs />} />
              <Route path="settings" element={<div className="p-8"><h1>Settings</h1></div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
