import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-800 space-y-3 shadow-sm max-w-lg mx-auto my-6 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={32} className="text-rose-600 shrink-0" />
            <h3 className="font-bold text-base text-rose-950">
              ⚠️ Không thể tải chức năng này.
            </h3>
          </div>
          <p className="text-xs text-rose-800 font-medium leading-relaxed">
            {this.props.fallbackMessage || 'Đã xảy ra lỗi không mong muốn khi khởi chạy module này.'}
          </p>
          {this.state.error && (
            <pre className="text-[10px] text-left font-mono bg-rose-100/50 p-2.5 rounded-lg overflow-x-auto text-rose-900 border border-rose-200">
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <RefreshCw size={13} />
            <span>Thử lại</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
