import React from 'react';

const HolographicDisplay: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            viewBox="0 0 200 150"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="Holographic motorcycle engine schematic"
        >
            <defs>
                <filter id="hologlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g fill="none" stroke="currentColor" strokeWidth="0.5" filter="url(#hologlow)">
                {/* Main Engine Block */}
                <path d="M70 60 L70 110 L130 110 L130 60 L110 40 L90 40 L70 60 Z" className="holo-main" />
                
                {/* Cooling Fins */}
                <path d="M70 65 H60 M70 75 H55 M70 85 H60 M70 95 H55" className="holo-fins-left" />
                <path d="M130 65 H140 M130 75 H145 M130 85 H140 M130 95 H145" className="holo-fins-right" />

                {/* Top cylinders */}
                <path d="M90 40 Q85 30 95 30 T105 40" />
                <path d="M110 40 Q115 30 105 30" />
                <ellipse cx="95" cy="30" rx="3" ry="1.5" className="holo-pulse" />
                <ellipse cx="105" cy="30" rx="3" ry="1.5" className="holo-pulse" style={{ animationDelay: '0.5s' }} />

                {/* Inner details */}
                <rect x="85" y="65" width="30" height="20" rx="5" className="holo-detail" />
                <circle cx="100" cy="95" r="12" />
                <path d="M100 83 L100 107 M88 95 L112 95" className="holo-cross" />

                {/* Data lines/Grid */}
                <path d="M30 50 L70 60 M30 75 L55 75 M30 100 L60 95" opacity="0.4" className="holo-grid" />
                <path d="M170 50 L130 60 M170 75 L145 75 M170 100 L140 95" opacity="0.4" className="holo-grid" />
            </g>
        </svg>
    );
};

export default HolographicDisplay;
