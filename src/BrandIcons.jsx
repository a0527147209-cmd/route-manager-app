export function WazeLogo({ size = 22, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 2C6.48 2 2 6.48 2 12c0 2.39.84 4.59 2.24 6.31C5.1 19.89 6.48 21 8 21.54c.81.29 1.66.46 2.53.46h2.94c.87 0 1.72-.17 2.53-.46 1.52-.54 2.9-1.65 3.76-3.23A9.96 9.96 0 0022 12c0-5.52-4.48-10-10-10z" fill="#33CCFF" />
            <circle cx="8.5" cy="10" r="1.5" fill="#222" />
            <circle cx="15.5" cy="10" r="1.5" fill="#222" />
            <path d="M8 14.5c0 0 1.5 2.5 4 2.5s4-2.5 4-2.5" stroke="#222" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
    );
}

export function GoogleMapsLogo({ size = 22, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.61 1.43 4.88 3.5 6.5L12 12l3.5 3.5C17.57 13.88 19 11.61 19 9c0-3.87-3.13-7-7-7z" fill="#4285F4" />
            <path d="M8.5 15.5L12 12l-3.5-3.5C7.14 9.88 5 11.61 5 14c0 1.93 1.16 3.6 2.82 4.87L8.5 15.5z" fill="#34A853" />
            <path d="M12 12l3.5 3.5c.68-.63 1.3-1.3 1.82-2L12 12z" fill="#FBBC04" />
            <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
    );
}
