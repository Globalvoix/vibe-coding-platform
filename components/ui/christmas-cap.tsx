import React from 'react';

export const ChristmasCap = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main hat body */}
      <path
        d="M20 60 L50 10 L80 60"
        fill="#ff0000"
        stroke="#ff0000"
        strokeWidth="2"
      />
      {/* Fur trim */}
      <path
        d="M15 60 Q50 70 85 60 L85 70 Q50 80 15 70 Z"
        fill="white"
      />
      {/* Pom-pom */}
      <circle cx="50" cy="10" r="8" fill="white" />
    </svg>
  );
};
