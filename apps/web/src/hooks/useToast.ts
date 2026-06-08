/**
 * Toast 通知 Hook
 * 全局轻量提示，支持 success / error 两种类型
 */
import { useState, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  return { toasts, show };
}
