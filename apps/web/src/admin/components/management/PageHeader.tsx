interface PageHeaderProps {
  title: string
  subtitle: string
  primaryAction?: { label: string; onClick: () => void }
}

const PageHeader = ({ title, subtitle, primaryAction }: PageHeaderProps) => (
  <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
    {primaryAction && (
      <button
        type="button"
        onClick={primaryAction.onClick}
        className="mt-4 shrink-0 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:mt-0"
      >
        {primaryAction.label}
      </button>
    )}
  </div>
)

export default PageHeader
