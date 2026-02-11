type PlaceholderProps = {
  title: string
}

const Placeholder = ({ title }: PlaceholderProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <p className="text-lg font-medium text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-500">Coming soon</p>
    </div>
  )
}

export default Placeholder
