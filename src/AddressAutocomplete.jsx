import { useEffect, useRef, useState } from 'react';

const GOOGLE_MAPS_KEY = 'AIzaSyC_a59N6ddV6m3gc46R57SYBaVFpVEpHJM';

// Detect if running inside Capacitor (native app)
const isCapacitor = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' ||
    window.location.hostname === 'localhost' && window.Capacitor?.isNativePlatform?.()
);

let googleMapsLoaded = false;
let googleMapsLoadPromise = null;

function loadGoogleMaps() {
    // Skip loading in Capacitor — CORS will block apis.google.com
    if (isCapacitor) return Promise.resolve();
    if (googleMapsLoaded) return Promise.resolve();
    if (googleMapsLoadPromise) return googleMapsLoadPromise;

    googleMapsLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&language=en`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            googleMapsLoaded = true;
            resolve();
        };
        script.onerror = (err) => {
            console.warn('Google Maps failed to load (may be blocked in native app):', err);
            resolve(); // Don't reject — let the input work as a plain text field
        };
        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
}

/**
 * AddressAutocomplete - Google Places autocomplete input
 * 
 * Props:
 *   value        - current input value
 *   onChange      - called with the raw input text
 *   onPlaceSelect - called with { address, city, state, zipCode, fullAddress, lat, lng }
 *   placeholder   - input placeholder
 *   className     - CSS classes
 *   required      - HTML required
 * 
 * Note: In Capacitor (native iOS/Android), Google Maps API is disabled
 * to avoid CORS issues. The input works as a regular text field.
 */
export default function AddressAutocomplete({
    value,
    onChange,
    onPlaceSelect,
    placeholder = 'Start typing an address...',
    className = '',
    required = false,
}) {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [loaded, setLoaded] = useState(googleMapsLoaded);

    useEffect(() => {
        loadGoogleMaps().then(() => setLoaded(true)).catch(console.error);
    }, []);

    useEffect(() => {
        if (!loaded || !inputRef.current || autocompleteRef.current) return;
        // In Capacitor or if Google Maps failed to load, skip autocomplete
        if (!window.google?.maps?.places) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'formatted_address', 'geometry'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.address_components) return;

            const get = (type) => {
                const comp = place.address_components.find(c => c.types.includes(type));
                return comp?.long_name || '';
            };
            const getShort = (type) => {
                const comp = place.address_components.find(c => c.types.includes(type));
                return comp?.short_name || '';
            };

            const streetNumber = get('street_number');
            const route = get('route');
            const city = get('locality') || get('sublocality_level_1') || get('administrative_area_level_3');
            const state = getShort('administrative_area_level_1');
            const zipCode = get('postal_code');
            const neighborhood = get('neighborhood');

            const address = streetNumber ? `${streetNumber} ${route}` : route;

            onPlaceSelect?.({
                address,
                city,
                state,
                zipCode,
                neighborhood,
                fullAddress: place.formatted_address || '',
                lat: place.geometry?.location?.lat(),
                lng: place.geometry?.location?.lng(),
            });

            // Also update the displayed value
            onChange?.(address);
        });

        autocompleteRef.current = autocomplete;

        return () => {
            if (autocompleteRef.current) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [loaded]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={loaded ? placeholder : 'Loading...'}
                className={className}
                required={required}
                autoComplete="off"
            />
        </div>
    );
}
