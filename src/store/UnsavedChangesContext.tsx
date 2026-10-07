import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  confirmIfUnsaved: (onProceed: () => void) => void;
  isConfirmDialogOpen: boolean;
  cancelNavigation: () => void;
  proceedNavigation: () => void;
  promptMessage: string;
  setPromptMessage: (msg: string) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [promptMessage, setPromptMessage] = useState<string>(
    'Dữ liệu chưa được lưu. Bạn có chắc chắn muốn quay lại giao diện chính không?'
  );

  const confirmIfUnsaved = useCallback((onProceed: () => void) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => onProceed);
      setIsConfirmDialogOpen(true);
    } else {
      onProceed();
    }
  }, [hasUnsavedChanges]);

  const cancelNavigation = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setPendingAction(null);
  }, []);

  const proceedNavigation = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setHasUnsavedChanges(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        confirmIfUnsaved,
        isConfirmDialogOpen,
        cancelNavigation,
        proceedNavigation,
        promptMessage,
        setPromptMessage
      }}
    >
      {children}

      {/* MODAL XÁC NHẬN KHI CÓ DỮ LIỆU CHƯA LƯU */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 animate-in zoom-in-95 duration-200 select-none">
            <div className="flex items-center gap-3.5 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Cảnh báo dữ liệu chưa lưu
                </h3>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  Thay đổi của bạn có thể bị mất nếu không lưu trước
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed text-center">
                “{promptMessage}”
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelNavigation}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Ở lại
              </button>
              
              <button
                type="button"
                onClick={proceedNavigation}
                className="px-5 py-2.5 bg-[#1457D9] hover:bg-[#0B3FA8] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Quay lại giao diện chính</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    return {
      hasUnsavedChanges: false,
      setHasUnsavedChanges: () => {},
      confirmIfUnsaved: (onProceed: () => void) => onProceed(),
      isConfirmDialogOpen: false,
      cancelNavigation: () => {},
      proceedNavigation: () => {},
      promptMessage: 'Dữ liệu chưa được lưu. Bạn có chắc chắn muốn quay lại giao diện chính không?',
      setPromptMessage: () => {}
    };
  }
  return context;
}
