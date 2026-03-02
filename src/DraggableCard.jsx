import { useRef, useCallback } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';

export default function DraggableCard({ loc, index, visitStatus = 'normal', children }) {
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
            className={`border-b-2 border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors ${visitStatus === 'recent' ? 'bg-slate-200/60 dark:bg-slate-700/40' : visitStatus === 'overdue' ? 'bg-red-100/80 dark:bg-red-900/30' : 'bg-white dark:bg-slate-900'}`}
            whileDrag={{ scale: 1.02, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', cursor: 'grabbing', zIndex: 50 }}
        >
            <div className="flex items-center gap-2 px-3 py-2.5">
                <div
                    className="shrink-0 flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing select-none"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                >
                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 tabular-nums w-5 text-center">
                        {index + 1}
                    </span>
                    <GripVertical size={12} className="text-slate-300 dark:text-slate-600" />
                </div>
                {children}
            </div>
        </Reorder.Item>
    );
}
