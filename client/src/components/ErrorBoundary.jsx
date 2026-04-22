import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <div className="text-center">
            <div className="text-lg font-semibold">Something went wrong</div>
            <div className="mt-1 text-sm text-gray-600">Try refreshing the page. If the issue persists, contact support.</div>
          </div>
          <button
            type="button"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
