import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("ErrorBoundary", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="glass max-w-md p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="gradient-bg mt-6 rounded-xl px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;