import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-app text-text-primary p-8">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong.</h1>
                    <pre className="bg-bg-card p-4 rounded-xl border border-border-subtle text-sm font-mono text-text-secondary max-w-2xl overflow-auto shadow-sm">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition shadow-sm"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
