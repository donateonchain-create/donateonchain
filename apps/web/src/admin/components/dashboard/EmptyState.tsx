interface EmptyStateProps {
  title: string
  description?: string
}

const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12 text-center">
    <p className="text-sm font-medium text-gray-600">{title}</p>
    {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
  </div>
)

export default EmptyState
