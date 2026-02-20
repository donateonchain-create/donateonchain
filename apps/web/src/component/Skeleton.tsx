export const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="w-full aspect-square bg-gray-200 animate-pulse"></div>
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
    </div>
)

export const SkeletonCampaignCard = () => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
        <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="flex items-center justify-between pt-4">
                <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
            </div>
        </div>
    </div>
)

export const SkeletonCreatorCard = () => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
        <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
    </div>
)

export const SkeletonProfile = () => (
    <div className="space-y-6">
        <div className="relative">
            <div className="w-full h-64 bg-gray-200 rounded-t-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                <div className="w-32 h-32 bg-gray-200 rounded-full border-4 border-white animate-pulse"></div>
            </div>
        </div>
        <div className="px-4 pt-16 space-y-4">
            <div className="text-center space-y-2">
                <div className="h-8 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="text-center space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
        <div className="px-4 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                        <div className="p-4 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4">
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            </div>
        ))}
    </div>
)

export const SkeletonText = ({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) => (
    <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`}></div>
)

export const SkeletonButton = ({ width = 'w-32' }: { width?: string }) => (
    <div className={`${width} h-10 bg-gray-200 rounded animate-pulse`}></div>
)

export const SkeletonBanner = () => (
    <div className="w-full h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
)

export const SkeletonGrid = ({ columns = 3, rows = 3 }: { columns?: number; rows?: number }) => (
    <div className={`grid grid-cols-${columns} gap-6`}>
        {[...Array(columns * rows)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden">
                <div className="w-full aspect-square bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            </div>
        ))}
    </div>
)

export const SkeletonProductDetail = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
        <div className="flex justify-center">
            <div className="w-full max-w-md">
                <div className="w-full aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
            </div>
        </div>
        <div className="flex flex-col justify-center max-w-md space-y-6">
            <div className="h-10 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="h-12 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="space-y-2 pt-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
            </div>
        </div>
    </div>
)

export const SkeletonCampaignDetail = () => (
    <div className="max-w-4xl mx-auto space-y-8">
        <div className="w-full h-[400px] bg-gray-200 rounded-3xl animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-24 ml-auto animate-pulse"></div>
        </div>
        <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                    <div className="p-6 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
)

export const SkeletonCartRow = () => (
    <div className="flex gap-4 border-b border-gray-200 pb-6">
        <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>
)

export const SkeletonFormApplication = () => (
    <section className="px-4 md:px-7 py-20 bg-gray-50 min-h-[60vh] flex items-center">
        <div className="max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm space-y-6">
                <div className="h-10 bg-gray-200 rounded w-2/3 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                </div>
                <div className="h-12 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
        </div>
    </section>
)

export const SkeletonCheckoutOverview = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-200 rounded-lg px-3">
                <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
        ))}
        <div className="mt-8 pt-6 border-t border-gray-300 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
    </div>
)

