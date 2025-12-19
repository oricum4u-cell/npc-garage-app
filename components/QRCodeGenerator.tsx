import React from 'react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ value, size = 128, className = '' }) => {
  // In a real app, this would use a library like qrcode.react
  // For this environment, we'll render a placeholder SVG to represent the QR code.

  return (
    <div className={className} style={{ width: size, height: size }}>
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-label={`QR Code for ${value}`}>
            <title>QR Code Placeholder</title>
            <path fill="#000" d="M0 0h14v14H0z M3 3h8v8H3z M18 0h4v4h-4z M0 18h4v4H0z M0 36h14v14H0z M3 39h8v8H3z M36 0h14v14H36z M39 3h8v8h-8z M22 12h4v4h-4z M18 18h4v4h-4z M26 18h4v4h-4z M30 18h4v4h-4z M18 26h4v4h-4z M26 30h4v4h-4z M18 36h4v4h-4z M22 36h4v4h-4z M26 36h4v4h-4z M30 36h4v4h-4z M36 18h4v4h-4z M44 18h4v4h-4z M36 26h4v4h-4z M40 22h4v4h-4z M36 36h14v14H36z M39 39h8v8h-8z M28 44h4v4h-4z"/>
        </svg>
    </div>
  );
};

export default QRCodeGenerator;
