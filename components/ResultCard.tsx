
import React from 'react';

interface ResultCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, icon, children }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm animate-fade-in">
            <div className="p-5 border-b border-gray-700 flex items-center space-x-3">
                <div className="text-teal-400">{icon}</div>
                <h2 className="text-xl font-bold text-gray-200">{title}</h2>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
};
