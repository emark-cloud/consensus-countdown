import { UserFriendlyError } from '@/lib/errors';

export function ErrorDisplay({
  error,
  onDismiss
}: {
  error: UserFriendlyError;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">{error.title}</h3>
          <p className="mt-2 text-sm text-red-800">{error.message}</p>
          {error.action && (
            <p className="mt-2 text-sm font-medium text-red-700">
              → {error.action}
            </p>
          )}
          {error.technicalDetails && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap overflow-x-auto">
                {error.technicalDetails}
              </pre>
            </details>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 font-bold text-lg"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
