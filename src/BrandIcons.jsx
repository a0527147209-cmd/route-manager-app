export function WazeLogo({ size = 22, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
            {/* Waze ghost shape */}
            <path d="M24 4C13.5 4 5 12.1 5 22c0 5.2 2.3 9.8 5.9 13 .2.2.1.5-.1.6-1.5.7-3.6 1.8-4.3 3.4-.4 1 .5 1.8 1.5 1.5 2.5-.7 5.2-2 7-3.2.3-.2.7-.2 1 0C18.4 39 21.1 40 24 40c10.5 0 19-8.1 19-18S34.5 4 24 4z" fill="#30B6FC" />
            {/* Left eye */}
            <ellipse cx="18" cy="21" rx="3" ry="3.5" fill="white" />
            <ellipse cx="19" cy="21.5" rx="1.5" ry="2" fill="#2D2D2D" />
            {/* Right eye */}
            <ellipse cx="30" cy="21" rx="3" ry="3.5" fill="white" />
            <ellipse cx="31" cy="21.5" rx="1.5" ry="2" fill="#2D2D2D" />
            {/* Smile */}
            <path d="M18 29c0 0 2.5 4 6 4s6-4 6-4" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );
}

export function GoogleMapsLogo({ size = 22, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 92.3 132.3" className={className}>
            {/* Google Maps official pin shape */}
            <path d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z" fill="#1a73e8" />
            <path d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.4 1.8 14.8 5 21L32.6 34.8 10.8 16.5z" fill="#ea4335" />
            <path d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.6 0 4.4-1.6 8.4-4.3 11.5L46.2 28.5z" fill="#4285f4" />
            <path d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.6 0-4.4 1.6-8.4 4.3-11.5l-27.8 32c6.3 11.7 16.3 27 29.4 46.7l25.2-39.1c-3.3 3-7.7 4.9-12.5 5.1-.3 0-.6 0-.9-.1v.5z" fill="#fbbc04" />
            <path d="M59.6 57.7c2.7-3.1 4.3-7.1 4.3-11.5 0-9.8-7.9-17.7-17.7-17.7v35.2c4.8-.2 9.2-2.1 12.5-5.1l.9-.9z" fill="#4285f4" />
            <path d="M46.2 132.3c13.1-19.7 23.1-35 29.4-46.7 5-9.7 16.7-30.5 16.7-39.5 0-14.6-6.8-27.6-17.4-36.1L46.2 63.8c.3 0 .6.1.9.1v68.4z" fill="#34a853" />
        </svg>
    );
}
