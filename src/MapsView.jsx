import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function MapsView() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t, isRtl } = useLanguage();
    const query = searchParams.get('q');

    // If no query, fallback or show error
    if (!query) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <p>No location specified.</p>
                <button onClick={() => navigate(-1)} className="ml-2 text-blue-500">Go Back</button>
            </div>
        );
    }

    // Construct Google Maps Embed URL
    // Note: For production, a Google Maps Embed API Key is recommended, but this simple iframe method often works for simple queries.
    // Alternatively, we can use the /maps?q=...&output=embed format
    const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 p-3 min-h-[50px] shadow-sm flex items-center gap-2 sticky top-0 z-10 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 shrink-0 ${isRtl ? '-me-1' : '-ms-1'}`}
                    title={t('back') || 'Back'}
                >
                    <ArrowLeft size={22} className={isRtl ? 'rotate-180' : ''} />
                </button>
                <h1 className="font-bold text-base text-slate-800 dark:text-white truncate">
                    {query}
                </h1>
            </header>

            {/* Map Iframe */}
            <div className="flex-1 w-full bg-slate-100 relative">
                <iframe
                    title="Google Maps"
                    width="100%"
                    height="100%"
                    style={{ border: 0, position: 'absolute', inset: 0 }}
                    src={mapUrl}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        </div>
    );
}
