
import React from 'react';
import { useGarage } from '../contexts/GarageContext.tsx';
import { LogoVariant } from '../types.ts';

interface LogoProps {
    className?: string;
    variant?: LogoVariant;
}

const Logo: React.FC<LogoProps> = ({ className, variant }) => {
    const { garageInfo } = useGarage();
    const activeVariant = variant || garageInfo.logoVariant || 'default';

    if (garageInfo.customLogo && !variant) {
        return (
            <img 
                src={garageInfo.customLogo} 
                alt="Garage Logo" 
                className={className}
                style={{ imageRendering: 'pixelated' }} 
            />
        );
    }

    // Common Defs for Shadows/Glows
    const Defs = () => (
        <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="1" dy="1" result="offsetblur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    );

    switch (activeVariant) {
        case 'rpm': // Sporty Tachometer
            return (
                <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="NPC RPM Logo">
                    <Defs />
                    <g filter="url(#shadow)">
                        {/* Gauge BG */}
                        <circle cx="60" cy="60" r="50" className="fill-gray-900 stroke-gray-700" strokeWidth="4" />
                        {/* Ticks */}
                        <path d="M60 15 V25 M92 28 L85 35 M105 60 H95" className="stroke-gray-500" strokeWidth="3" strokeLinecap="round" />
                        {/* Red Zone */}
                        <path d="M95 60 A 35 35 0 0 1 85 85" fill="none" className="stroke-red-600" strokeWidth="4" />
                        {/* Needle */}
                        <line x1="60" y1="60" x2="90" y2="80" className="stroke-red-500 origin-center animate-pulse" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="60" cy="60" r="5" className="fill-gray-300" />
                        {/* Text */}
                        <text x="60" y="45" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="900" textAnchor="middle" className="fill-white">NPC</text>
                        <text x="60" y="95" fontFamily="monospace" fontSize="10" textAnchor="middle" className="fill-primary-500 tracking-widest">GARAGE</text>
                    </g>
                </svg>
            );

        case 'wings': // Classic Moto Wing
            return (
                <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="NPC Wings Logo">
                    <Defs />
                    <g filter="url(#shadow)">
                        {/* Left Wing */}
                        <path d="M10 60 Q30 20 50 50 L50 70 Q30 90 10 60 Z" className="fill-gray-700 stroke-primary-500" strokeWidth="2" />
                        {/* Right Wing */}
                        <path d="M110 60 Q90 20 70 50 L70 70 Q90 90 110 60 Z" className="fill-gray-700 stroke-primary-500" strokeWidth="2" />
                        {/* Center Wheel */}
                        <circle cx="60" cy="60" r="25" className="fill-gray-900 stroke-gray-300" strokeWidth="4" />
                        <circle cx="60" cy="60" r="8" className="fill-primary-600" />
                        <text x="60" y="66" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="bold" textAnchor="middle" className="fill-white">NPC</text>
                    </g>
                </svg>
            );

        case 'hex': // Cyberpunk/AI
            return (
                <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="NPC Hex Logo">
                    <Defs />
                    <g filter="url(#shadow)">
                        {/* Hexagon */}
                        <path d="M60 10 L103 35 V85 L60 110 L17 85 V35 Z" className="fill-gray-900/80 stroke-cyan-500" strokeWidth="2" />
                        {/* Circuit Lines */}
                        <path d="M60 10 V35 M17 85 L35 75 M103 85 L85 75" className="stroke-cyan-500/50" strokeWidth="2" />
                        <circle cx="60" cy="60" r="15" className="fill-none stroke-cyan-400" strokeWidth="2" strokeDasharray="4 2" />
                        <text x="60" y="66" fontFamily="monospace" fontSize="20" fontWeight="bold" textAnchor="middle" className="fill-cyan-400">NPC</text>
                    </g>
                </svg>
            );

        case 'shield': // Premium/Secure
            return (
                <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="NPC Shield Logo">
                    <Defs />
                    <g filter="url(#shadow)">
                        {/* Shield Shape */}
                        <path d="M20 20 H100 L90 80 Q60 110 30 80 L20 20 Z" className="fill-gray-800 stroke-yellow-500" strokeWidth="3" />
                        {/* Inner V */}
                        <path d="M35 30 L60 90 L85 30" fill="none" className="stroke-yellow-600/50" strokeWidth="2" />
                        <text x="60" y="55" fontFamily="serif" fontSize="36" fontWeight="bold" textAnchor="middle" className="fill-white">N</text>
                        <text x="60" y="80" fontFamily="sans-serif" fontSize="12" fontWeight="bold" textAnchor="middle" className="fill-yellow-500 tracking-widest">GARAGE</text>
                    </g>
                </svg>
            );

        default: // Industrial Gear (Original)
            return (
                <svg
                    className={className}
                    viewBox="0 0 120 120"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="NPC Garage Logo"
                >
                    <Defs />
                    <g filter="url(#shadow)">
                        {/* Gear shape */}
                        <path
                            d="M60,10.001 L65.878,11.837 70.001,20 78.68,21.32 85.001,28.68 90,31.32 95.001,40 101.32,45 105.001,52.68 106.837,60 105.001,67.32 101.32,75 95.001,80 90,88.68 85.001,91.32 78.68,98.68 70.001,100 65.878,108.163 60,110 54.122,108.163 50.001,100 41.32,98.68 35.001,91.32 30,88.68 25.001,80 18.68,75 15.001,67.32 13.163,60 15.001,52.68 18.68,45 25.001,40 30,31.32 35.001,28.68 41.32,21.32 50.001,20 54.122,11.837 Z"
                            className="fill-current text-gray-700 dark:text-gray-400"
                        />
                        {/* Red inner circle */}
                        <circle cx="60" cy="60" r="42" className="fill-current text-primary-600" />
                        {/* Darker inner circle for depth */}
                        <circle cx="60" cy="60" r="36" className="fill-current text-white dark:text-gray-800" />
                        {/* Text */}
                        <text
                            x="60"
                            y="72"
                            fontFamily="Inter, sans-serif"
                            fontSize="32"
                            fontWeight="800"
                            textAnchor="middle"
                            className="fill-current text-primary-600"
                        >
                            NPC
                        </text>
                    </g>
                </svg>
            );
    }
};

export default Logo;
