export function WazeLogo({ size = 22, className = '' }) {
    return (
        <img
            src="/icons/waze.png"
            alt="Waze"
            width={size}
            height={size}
            className={className}
            style={{ objectFit: 'contain', borderRadius: '4px' }}
        />
    );
}

export function GoogleMapsLogo({ size = 22, className = '' }) {
    return (
        <img
            src="/icons/google-maps.png"
            alt="Google Maps"
            width={size}
            height={size}
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
}
