import React from 'react';

export const LinkifyText = ({ text, className = '' }) => {
    if (!text) return null;

    // Improved regex to catch more phone formats:
    // 050-123-4567, 050-1234567, 0501234567 (Mobile)
    // 03-1234567, 03-123-4567 (Landline)
    // *1234 (Short code)
    // 1-800-..., 1700-... (Toll free)
    // Capturing group is essential for split to include the separator in the result array
    const phoneRegex = /(\b0(?:5\d|7\d|[23489])[- ]?\d{7}\b|\b0(?:5\d|7\d|[23489])[- ]?\d{3}[- ]?\d{4}\b|\*\d{3,5}\b|\b1[78]00[- ]?\d{3}[- ]?\d{3}\b)/g;

    const parts = text.split(phoneRegex);

    return (
        <div className={`${className} break-words whitespace-pre-wrap`}>
            {parts.map((part, i) => {
                // With split(regex_capture_group), odd indices are the matches
                if (i % 2 === 1) {
                    // Clean all non-digit characters for the tel: link
                    const cleanNumber = part.replace(/\D/g, '');
                    return (
                        <a
                            key={i}
                            href={`tel:${cleanNumber}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline text-blue-600 dark:text-blue-400 font-bold decoration-2 underline-offset-2 break-all inline-block direction-ltr"
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
