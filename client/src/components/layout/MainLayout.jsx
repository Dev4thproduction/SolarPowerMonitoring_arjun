import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout = () => {
    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-200 min-w-0 overflow-y-auto">
                <div className="max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
