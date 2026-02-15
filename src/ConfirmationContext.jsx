import { createContext, useContext, useState, useRef, useCallback } from 'react';
import ConfirmationModal from './components/ConfirmationModal';

const ConfirmationContext = createContext();

export function useConfirmation() {
    return useContext(ConfirmationContext);
}

export function ConfirmationProvider({ children }) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        cancelText: '',
        isDelete: false,
    });

    const resolver = useRef();

    const confirm = useCallback(({
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        isDelete = false
    }) => {
        setModalState({
            isOpen: true,
            title,
            message,
            confirmText,
            cancelText,
            isDelete,
        });

        return new Promise((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (resolver.current) {
            resolver.current(true);
        }
    };

    const handleCancel = () => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (resolver.current) {
            resolver.current(false);
        }
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            {modalState.isOpen && (
                <ConfirmationModal
                    title={modalState.title}
                    message={modalState.message}
                    confirmText={modalState.confirmText}
                    cancelText={modalState.cancelText}
                    isDelete={modalState.isDelete}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmationContext.Provider>
    );
}
