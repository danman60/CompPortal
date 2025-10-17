'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Error Boundary Component
 *
 * Catches errors in child components and provides graceful degradation
 * with retry functionality. Prevents component crashes from breaking
 * the entire application.
 *
 * Created: Wave 1.3 (Error Boundaries)
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Name identifier for debugging purposes
   */
  boundaryName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `ErrorBoundary [${this.props.boundaryName || 'Unknown'}] caught error:`,
      error,
      errorInfo
    );

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-8 max-w-2xl w-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-red-400 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-300 mb-4">
                  {this.props.boundaryName
                    ? `An error occurred in the ${this.props.boundaryName} component.`
                    : 'An unexpected error occurred.'}
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-4 bg-black/30 rounded-lg">
                    <summary className="cursor-pointer text-sm text-gray-400 font-semibold mb-2">
                      Error Details (Development Only)
                    </summary>
                    <div className="text-xs text-red-300 font-mono overflow-auto max-h-[200px]">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all font-semibold"
              >
                ↻ Reload Page
              </button>
              <a
                href="/dashboard"
                className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all font-semibold"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
