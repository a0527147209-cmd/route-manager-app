import React from 'react';

export const LinkifyText = ({ text, className = '' }) => {
    if (!text) return null;
    // Enhanced regex for Israeli mobile (05X-XXXXXXX), landline (0X-XXXXXXX), short (*XXXX), and plain digits (05XXXXXXXX)
    const phoneRegex = /(\b05\d-?\d{7}\b|\b0[23489]-?\d{7}\b|\b07\d-?\d{7}\b|\*\d{3,5}\b)/g;

    const parts = text.split(phoneRegex);

    return (
        <span className={`${className} break-words whitespace-pre-wrap`}>
            {parts.map((part, i) => {
                if (part.match(phoneRegex)) {
                    const cleanNumber = part.replace(/-/g, '');
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
                return part;
            })}
        </span>
    );
};
