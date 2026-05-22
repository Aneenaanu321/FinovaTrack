import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from '../components/Modal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: options.danger ?? false,
      });
    });
  }, []);

  const close = (result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} title={state?.title}>
        {state && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{state.message}</p>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-secondary min-h-[44px] px-4" onClick={() => close(false)}>
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={state.danger ? 'btn-danger min-h-[44px] px-4' : 'btn-primary min-h-[44px] px-4'}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
