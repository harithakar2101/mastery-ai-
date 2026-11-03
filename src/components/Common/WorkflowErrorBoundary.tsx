import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  workflowName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WorkflowErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`WorkflowErrorBoundary caught an error in ${this.props.workflowName || 'workflow'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] p-8 bg-slate-900 border border-rose-900/60 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100">
              {this.props.workflowName || 'Workflow'} Encountered a Runtime Exception
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {this.state.error?.message || 'An unexpected error occurred while executing this component.'}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Component
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
