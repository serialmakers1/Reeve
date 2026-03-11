import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <pre className="text-sm text-gray-600 bg-gray-100 p-4 rounded overflow-auto">
              {this.state.error?.message}
              {'\n'}
              {this.state.error?.stack}
            </pre>
            <a href="/" className="mt-4 inline-block text-blue-700 underline">Go home</a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
