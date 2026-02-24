import { useRef, useCallback } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';

export default function DraggableCard({ loc, index, visited, children }) {
    const controls = useDragControls();
    const longPressTimer = useRef(null);
    const isDragging = useRef(false);

    const handlePointerDown = useCallback((e) => {
        isDragging.current = false;
        longPressTimer.current = setTimeout(() => {
            isDragging.current = true;
            controls.start(e);
        }, 300);
    }, [controls]);

    const handlePointerUp = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handlePointerCancel = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    return (
        <Reorder.Item
            key={loc?.id}
            value={loc}
            dragListener={false}
            dragControls={controls}
            className={`border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors ${visited ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}`}
            whileDrag={{ scale: 1.01, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', cursor: 'grabbing', zIndex: 50 }}
        >
            <div className="flex items-center">
                <div
                    className="shrink-0 flex items-center justify-center w-7 cursor-grab active:cursor-grabbing select-none pl-1"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                >
                    <GripVertical size={14} className="text-slate-300 dark:text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </Reorder.Item>
    );
}
