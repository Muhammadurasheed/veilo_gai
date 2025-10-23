
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
    return (
        <button
            {...props}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-bold text-white bg-teal-600 border border-transparent rounded-full shadow-lg hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500 transition-all duration-300 ease-in-out transform hover:scale-105"
        >
            {children}
        </button>
    );
};
