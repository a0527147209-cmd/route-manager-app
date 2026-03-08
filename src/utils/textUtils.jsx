import React from 'react';
import { Phone, MessageSquare } from 'lucide-react';

const PHONE_REGEX = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b0[\d\-\s]{8,}\b|\*\d{3,5}\b)/g;

function cleanPhone(raw) {
    return raw.replace(/[^\d*+]/g, '');
}

export const LinkifyText = ({ text, className = '' }) => {
    if (!text) return null;

    const parts = String(text).split(PHONE_REGEX);

    return (
        <div className={`${className} break-all whitespace-normal w-full`}>
            {parts.map((part, i) => {
                if (i % 2 === 1) {
                    const num = cleanPhone(part);
                    return (
                        <span key={i} className="inline-flex items-center gap-0.5 relative z-10 pointer-events-auto" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{part}</span>
                            <a
                                href={`tel:${num}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center w-4 h-4 rounded bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 transition-colors"
                                title="Call"
                            >
                                <Phone size={9} className="text-green-700 dark:text-green-400" strokeWidth={2.5} />
                            </a>
                            <a
                                href={`sms:${num}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                                title="SMS"
                            >
                                <MessageSquare size={9} className="text-blue-700 dark:text-blue-400" strokeWidth={2.5} />
                            </a>
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
};
