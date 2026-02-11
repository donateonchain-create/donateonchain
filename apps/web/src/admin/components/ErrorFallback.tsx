import { AlertCircle } from 'lucide-react'

interface ErrorFallbackProps {
  title?: string
  message?: string
  onRetry?: () => void
}

const ErrorFallback = ({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again.',
  onRetry,
}: ErrorFallbackProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 py-16 px-6 text-center">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorFallback
