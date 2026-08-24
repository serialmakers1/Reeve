import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-6">
              An unexpected error occurred. Please reload or return home.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 text-sm"
              >
                Reload page
              </button>
              <a href="/" className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                Go home
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
