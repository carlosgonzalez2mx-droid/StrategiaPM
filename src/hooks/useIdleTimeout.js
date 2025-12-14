import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to detect user inactivity and trigger a callback after a specified timeout
 * 
 * @param {Function} onIdle - Callback function to execute when user is idle
 * @param {number} timeout - Timeout in milliseconds (default: 5 minutes)
 * @param {Object} options - Additional options
 * @param {Function} options.onWarning - Optional callback for warning before timeout
 * @param {number} options.warningTime - Time in ms before timeout to trigger warning (default: 1 minute)
 */
const useIdleTimeout = (onIdle, timeout = 300000, options = {}) => {
    const { onWarning, warningTime = 60000 } = options;

    const timeoutId = useRef(null);
    const warningTimeoutId = useRef(null);
    const lastActivityTime = useRef(Date.now());

    // Reset the idle timer
    const resetTimer = useCallback(() => {
        lastActivityTime.current = Date.now();

        // Clear existing timers
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }
        if (warningTimeoutId.current) {
            clearTimeout(warningTimeoutId.current);
        }

        // Set warning timer if callback provided
        if (onWarning && warningTime > 0) {
            warningTimeoutId.current = setTimeout(() => {
                onWarning();
            }, timeout - warningTime);
        }

        // Set main idle timeout
        timeoutId.current = setTimeout(() => {
            console.log('⏱️ Usuario inactivo - ejecutando logout automático');
            onIdle();
        }, timeout);
    }, [onIdle, onWarning, timeout, warningTime]);

    // Debounced activity handler to avoid excessive timer resets
    const handleActivity = useCallback(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityTime.current;

        // Only reset if more than 1 second has passed since last activity
        // This prevents excessive resets from rapid events
        if (timeSinceLastActivity > 1000) {
            resetTimer();
        }
    }, [resetTimer]);

    useEffect(() => {
        // List of events that indicate user activity
        const events = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'click',
            'wheel'
        ];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Start the initial timer
        resetTimer();

        // Cleanup function
        return () => {
            // Remove event listeners
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });

            // Clear timers
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
            if (warningTimeoutId.current) {
                clearTimeout(warningTimeoutId.current);
            }
        };
    }, [handleActivity, resetTimer]);

    // Return a function to manually reset the timer if needed
    return { resetTimer };
};

export default useIdleTimeout;
