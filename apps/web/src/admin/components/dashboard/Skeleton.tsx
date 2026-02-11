interface SkeletonProps {
  className?: string
}

const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    className={`rounded bg-gray-100 animate-pulse ${className}`}
    aria-hidden="true"
  />
)

export default Skeleton
