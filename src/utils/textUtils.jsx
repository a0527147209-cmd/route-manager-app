import React from 'react';

export const LinkifyText = ({ text, className = '' }) => {
    if (!text) return null;

    // Broader regex to catch any phone-like pattern starting with 0 or *
    // Matches: 050-123-4567, 03 1234567, *1234, 0501234567
    // Must be at least 8 chars long for standard nums, or 4 for short codes
    const phoneRegex = /(\b0[\d\-\s]{8,}\b|\*\d{3,5}\b)/g;

    const parts = String(text).split(phoneRegex);

    return (
        <div className={`${className} break-all whitespace-normal w-full`}>
            {parts.map((part, i) => {
                // With split(regex_capture_group), odd indices are the matches
                if (i % 2 === 1) {
                    const cleanNumber = part.replace(/[^\d*]/g, '');
                    return (
                        <a
                            key={i}
                            href={`tel:${cleanNumber}`}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            className="hover:underline text-blue-600 dark:text-blue-400 font-bold decoration-2 underline-offset-2 relative z-10 pointer-events-auto"
                            style={{ direction: 'ltr', unicodeBidi: 'embed' }}
                        >
                            {part}
                        </a>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
};
