import React from 'react'
import { formatCampaignPercentLabel } from '../utils/hbar'

type CampaignCardProps = {
    image: string
    title: string
    amountRaised: string
    target: string
    percentage: number
    deadlineText?: string
    alt?: string
    className?: string
    onClick?: () => void
}

const CampaignCard: React.FC<CampaignCardProps> = ({
    image,
    title,
    amountRaised,
    target,
    percentage,
    deadlineText,
    alt = "Campaign",
    className = "",
    onClick
}) => {
    const rawPct = Number(percentage)
    const safePct = Number.isFinite(rawPct) ? Math.max(0, rawPct) : 0
    const barWidth = Math.min(100, safePct)
    const percentLabel = formatCampaignPercentLabel(safePct)

    return (
        <div
            className={`bg-white rounded-3xl overflow-hidden hover:border hover:border-black/10 transition-colors cursor-pointer group ${className}`}
            onClick={onClick}
        >

            <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
                <img
                    src={image}
                    alt={alt}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = '/placeholder-campaign.svg' }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>


            <div className="p-4">
                <h3 className="text-[20px] font-semibold leading-tight mb-3">
                    {title}
                </h3>

                {deadlineText && (
                    <div className="mb-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {deadlineText}
                        </span>
                    </div>
                )}

                <div className="relative h-12 rounded-full overflow-hidden bg-white border-2 border-gray-300">

                    <div
                        className="absolute left-0 top-0 h-full bg-[#4ADE80] rounded-full transition-all duration-500 min-w-0 max-w-full"
                        style={{ width: `${barWidth}%` }}
                    >

                        <div className="absolute left-0 top-0 h-full flex items-center px-4 min-w-0 max-w-full overflow-hidden">
                            <span className="text-[16px] font-semibold text-black truncate">{amountRaised}</span>
                        </div>
                    </div>


                    <div className="absolute right-3 top-0 h-full flex items-center z-10 pointer-events-none">
                        <span className="text-[16px] font-semibold text-black tabular-nums rounded-md bg-white/90 px-1.5 py-0.5 shadow-sm">
                            {percentLabel}
                        </span>
                    </div>
                </div>


                <div className="mt-2 text-right">
                    <span className="text-sm text-gray-600">Target: {target}</span>
                </div>
            </div>
        </div>
    )
}

export default CampaignCard

