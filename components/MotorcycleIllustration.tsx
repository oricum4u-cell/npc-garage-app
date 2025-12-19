import React from 'react';

const MotorcycleIllustration: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Motorcycle illustration"
    >
        <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            {/* Frame and Body */}
            <path d="M50 130 L80 130 L100 90 L150 90 L160 110" />
            <path d="M80 130 L70 90 L100 90" />
            <path d="M120 90 L130 130 L160 130" />
            
            {/* Wheels */}
            <circle cx="65" cy="130" r="25" />
            <circle cx="165" cy="130" r="25" />
            
            {/* Engine */}
            <rect x="85" y="105" width="30" height="25" rx="5" />
            
            {/* Handlebars */}
            <path d="M100 90 L90 70 L70 75" />

            {/* Seat */}
            <path d="M130 90 L160 90" strokeWidth="6" />
        </g>
    </svg>
  );
};

export default MotorcycleIllustration;
