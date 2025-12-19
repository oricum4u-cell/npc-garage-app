import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface LogoutButtonProps {
    onClick: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onClick }) => {
    const { t } = useLanguage();

    return (
        <button
            onClick={onClick}
            title={t('user.logout')}
            className="group flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2 transition-colors duration-300
                       bg-gray-800 text-white hover:bg-gray-700
                       dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-gray-300"
        >
            <span className="font-semibold">
                {t('user.logout')}
            </span>
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-hidden"
                aria-hidden="true"
            >
                {/* Door Frame */}
                <path
                    d="M16 17V7C16 5.89543 15.1046 5 14 5H8C6.89543 5 6 5.89543 6 7V17C6 18.1046 6.89543 19 8 19H14C15.1046 19 16 18.1046 16 17Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Door Knob */}
                <path
                    d="M13 12H13.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Person */}
                <g className="transition-transform duration-300 ease-in-out group-hover:translate-x-6">
                    <path
                        d="M3 12H10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M7 8L3 12L7 16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </svg>
        </button>
    );
};

export default LogoutButton;
