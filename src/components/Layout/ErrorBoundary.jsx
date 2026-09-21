import { Component } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

/**
 * Batch 14, S1: safety-net Error Boundary wrapping top-level routed views.
 * Without this, any unhandled render/lifecycle error in a descendant
 * component blanks the entire page (React unmounts the tree on an
 * uncaught error) with no recoverable, user-facing state. This is
 * explicitly a safety net — it does NOT replace fixing the actual root
 * cause of a given crash (see Batch 14, Issue #1's Map-icon-shadowing fix
 * for an example of a root-cause fix that happened alongside this).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Real error still goes to the console/log pipeline for debugging —
    // this boundary only changes what the USER sees, not what gets logged.
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  handleGoBack = () => {
    this.setState({ hasError: false });
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign('/');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <Card className="max-w-md p-8 text-center">
            <h1 className="font-display text-xl font-bold text-navy-950">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500">
              An unexpected error occurred while displaying this page. You can try going back or reloading the page.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleGoBack}>Go back</Button>
              <Button variant="primary" size="sm" onClick={this.handleReload}>Reload page</Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
