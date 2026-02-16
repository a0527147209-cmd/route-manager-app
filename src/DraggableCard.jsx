import { useRef, useCallback } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';

export default function DraggableCard({ loc, index, visited, children }) {
    const controls = useDragControls();
    const longPressTimer = useRef(null);
    const isDragging = useRef(false);

    const handlePointerDown = useCallback((e) => {
        // Start a long-press timer
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
            className={`rounded-lg p-2 shadow-sm border border-border transition-shadow ${visited ? 'bg-gray-200 dark:bg-gray-700/60' : 'bg-card'}`}
            whileDrag={{ scale: 1.03, boxShadow: '0 8px 25px rgba(0,0,0,0.15)', cursor: 'grabbing' }}
        >
            <div className="flex items-start gap-1.5">
                <div
                    className="shrink-0 flex flex-col items-center pt-0.5 gap-0.5 cursor-grab active:cursor-grabbing select-none"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                >
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center">
                        {index + 1}
                    </span>
                    <GripVertical size={14} className="text-muted-foreground/40" />
                </div>
                {children}
            </div>
        </Reorder.Item>
    );
}
