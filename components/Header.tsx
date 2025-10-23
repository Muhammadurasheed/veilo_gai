
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2">
                Hedera Hackathon <span className="text-teal-400">Assistant</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Generate your next big idea and a winning team name for the Hedera Hackathon.
            </p>
        </header>
    );
};
