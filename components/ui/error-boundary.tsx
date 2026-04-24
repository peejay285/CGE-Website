"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Section name for the error UI */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-xl border border-border bg-surface-alt p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-magenta/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-magenta" />
            </div>
          </div>
          <p className="text-sm font-semibold text-text mb-1">
            {this.props.section
              ? `Something went wrong loading ${this.props.section}`
              : "Something went wrong"}
          </p>
          <p className="text-xs text-text-muted mb-4">
            This section couldn&apos;t load. Try refreshing.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan/10 border border-cyan/20 text-xs font-semibold text-cyan hover:bg-cyan/15 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error fallback for widgets that fail to load —
 * shows a minimal card instead of crashing the page.
 */
export function WidgetErrorFallback({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <AlertTriangle size={16} className="text-text-muted/40 mx-auto mb-2" />
      <p className="text-[10px] text-text-muted">
        Couldn&apos;t load {name}
      </p>
    </div>
  );
}
