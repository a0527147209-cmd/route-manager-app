import { Trash2, AlertCircle } from 'lucide-react';

export default function ConfirmationModal({
    title,
    message,
    confirmText,
    cancelText,
    isDelete,
    onConfirm,
    onCancel
}) {
    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
                onClick={onCancel}
                aria-hidden="true"
            />
            <div
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-[280px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 p-5 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="text-center space-y-2">
                    <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-1 ${isDelete ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                        {isDelete ? (
                            <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                        ) : (
                            <AlertCircle size={20} className="text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex gap-2 w-full">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all text-xs"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-3 py-2 rounded-xl font-semibold shadow-md active:scale-95 transition-all text-xs text-white ${isDelete
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-red-900/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </>
    );
}
