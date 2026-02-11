export const summaryMetrics = {
  totalDonations: { value: '125,430', subtext: 'HBAR', trend: '+12% vs last month' },
  activeCampaigns: { value: 24, subtext: 'live', trend: '3 ending soon' },
  totalNgos: { value: 89, subtext: 'verified', trend: '+5 this week' },
  totalDesigners: { value: 42, subtext: 'verified', trend: '+2 this week' },
  pendingKycReviews: { value: 7, subtext: 'awaiting', trend: 'Needs attention' },
  openComplaints: { value: 3, subtext: 'unresolved', trend: '1 urgent' },
}

export const actionRequired: Array<{
  id: string
  type: string
  title: string
  description: string
  count: number
  priority: 'urgent' | 'attention' | 'neutral'
  cta: string
}> = [
  { id: '1', type: 'ngo', title: 'Pending NGO Approvals', description: '5 organizations awaiting verification', count: 5, priority: 'urgent', cta: 'Review' },
  { id: '2', type: 'designer', title: 'Pending Designer Approvals', description: '3 designers need portfolio review', count: 3, priority: 'attention', cta: 'Review' },
  { id: '3', type: 'kyc', title: 'Pending KYC Verifications', description: '7 users waiting for identity verification', count: 7, priority: 'attention', cta: 'Verify' },
  { id: '4', type: 'campaign', title: 'Flagged Campaign', description: 'Campaign #12 reported for policy violation', count: 1, priority: 'urgent', cta: 'View' },
  { id: '5', type: 'complaint', title: 'Unresolved Complaints', description: '3 complaints need admin response', count: 3, priority: 'neutral', cta: 'Resolve' },
  { id: '6', type: 'transaction', title: 'Stuck Transactions', description: '2 donations pending confirmation', count: 2, priority: 'attention', cta: 'Check' },
]

export const platformActivity = {
  donations: {
    today: 12,
    thisWeek: 47,
    newCampaigns: 4,
    completedCampaigns: 2,
    flaggedCampaigns: 1,
  },
  health: {
    transactionSuccessRate: 99.2,
    walletConnectionIssues: 0,
    avgApprovalTime: '2.4 days',
    systemStatus: 'All systems operational',
  },
}

export const recentDonations = [
  { id: 'D-1024', amount: '150 HBAR', campaign: 'Medical Aid Kenya', donor: '0x7a3b2c1d4e5f6789012345678901234567890f2', time: '2 min ago', status: 'completed', transactionHash: '0xabc123' },
  { id: 'D-1023', amount: '50 HBAR', campaign: 'Clean Water Uganda', donor: '0x8b4c3d2e1f0a9876543210987654321098761c3', time: '15 min ago', status: 'completed', transactionHash: '0xdef456' },
  { id: 'D-1022', amount: '500 HBAR', campaign: 'School Supplies', donor: '0x2c1d4e5f67890123456789012345678901237d4', time: '1 hr ago', status: 'completed', transactionHash: '0xghi789' },
  { id: 'D-1021', amount: '25 HBAR', campaign: 'Refugee Support', donor: '0x9e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c12a1', time: '2 hrs ago', status: 'completed', transactionHash: '0xjkl012' },
  { id: 'D-1020', amount: '200 HBAR', campaign: 'Flood Relief', donor: '0x4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d28b9', time: '4 hrs ago', status: 'completed', transactionHash: '0xmno345' },
]

export const recentCampaigns = [
  { id: 'C-48', title: 'Rural Healthcare Initiative', ngo: 'HealthFirst NGO', ngoName: 'HealthFirst NGO', created: '1 hr ago', status: 'pending', description: 'Providing essential healthcare services to rural communities in Kenya.', goal: '10,000', amountRaised: '2,450' },
  { id: 'C-47', title: 'Youth Education Program', ngo: 'EduCare', ngoName: 'EduCare', created: '3 hrs ago', status: 'active', description: 'Scholarship fund for underprivileged youth to access quality education.', goal: '25,000', amountRaised: '18,200' },
  { id: 'C-46', title: 'Disaster Relief Fund', ngo: 'HelpNow', ngoName: 'HelpNow', created: '5 hrs ago', status: 'active', description: 'Emergency relief for communities affected by natural disasters.', goal: '50,000', amountRaised: '32,100' },
  { id: 'C-45', title: 'Food Security Project', ngo: 'FeedTomorrow', ngoName: 'FeedTomorrow', created: '1 day ago', status: 'active', description: 'Sustainable agriculture and food distribution programs.', goal: '15,000', amountRaised: '12,800' },
  { id: 'C-44', title: 'Shelter Construction', ngo: 'BuildHope', ngoName: 'BuildHope', created: '2 days ago', status: 'completed', description: 'Building safe housing for homeless families.', goal: '30,000', amountRaised: '30,000' },
]

export const recentApprovedNgos = [
  { ngoName: 'GreenEarth Foundation', name: 'GreenEarth Foundation', wallet: '0x3a2...b8c', walletAddress: '0x3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5b8c', email: 'contact@greenearth.org', phoneNumber: '+254 700 123 456', registrationNumber: 'REG-2024-001', yearFounded: '2015', organizationType: 'Non-Profit', website: 'https://greenearth.org', country: 'Kenya', stateRegion: 'Nairobi', address: 'P.O. Box 12345, Nairobi', focusAreas: 'Environment, Conservation, Climate Action', approved: '2 hrs ago', logoHash: 'QmXyz1', registrationCertHash: 'QmAbc2', annualReportHash: 'QmDef3' },
  { ngoName: 'Clean Oceans Initiative', name: 'Clean Oceans Initiative', wallet: '0x9d1...4e7', walletAddress: '0x9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c4e7', email: 'info@cleanoceans.org', phoneNumber: '+256 711 234 567', registrationNumber: 'REG-2024-002', yearFounded: '2018', organizationType: 'Charity', website: 'https://cleanoceans.org', country: 'Uganda', stateRegion: 'Kampala', address: 'Suite 200, Ocean Plaza', focusAreas: 'Marine Conservation, Plastic Waste', approved: '1 day ago', logoHash: 'QmGhi4', registrationCertHash: 'QmJkl5' },
  { ngoName: 'Tech for Good', name: 'Tech for Good', wallet: '0x7f5...2a9', walletAddress: '0x7f5e4d3c2b1a0b9c8d7e6f5a4b3c2d1e0f9a2b9', email: 'hello@techforgood.org', phoneNumber: '+233 722 345 678', registrationNumber: 'REG-2024-003', yearFounded: '2020', organizationType: 'Social Enterprise', website: 'https://techforgood.org', country: 'Ghana', stateRegion: 'Accra', address: 'Tech Hub Building, Block B', focusAreas: 'Digital Literacy, Youth Employment', approved: '2 days ago', logoHash: 'QmMno6', metadataHash: 'QmPqr7' },
]

export const recentDesignsBought = [
  { id: 'DS-88', pieceName: 'Hope Logo', design: 'Hope Logo', buyer: '0x7a3b2c1d4e5f6789012345678901234567890f2', amount: '25 HBAR', price: '25', campaign: 'Medical Aid Kenya', type: 'Logo', time: '5 min ago', status: 'completed', transactionHash: '0xstu890' },
  { id: 'DS-87', pieceName: 'Unity Emblem', design: 'Unity Emblem', buyer: '0x8b4c3d2e1f0a9876543210987654321098761c3', amount: '15 HBAR', price: '15', campaign: 'Clean Water Uganda', type: 'Badge', time: '1 hr ago', status: 'completed', transactionHash: '0xvwx123' },
  { id: 'DS-86', pieceName: 'Health Shield', design: 'Health Shield', buyer: '0x2c1d4e5f67890123456789012345678901237d4', amount: '40 HBAR', price: '40', campaign: 'School Supplies', type: 'Merchandise', time: '2 hrs ago', status: 'completed', transactionHash: '0xyza456' },
  { id: 'DS-85', pieceName: 'Earth Care Badge', design: 'Earth Care Badge', buyer: '0x9e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c12a1', amount: '30 HBAR', price: '30', campaign: 'Refugee Support', type: 'Badge', time: '4 hrs ago', status: 'completed', transactionHash: '0xbcd789' },
  { id: 'DS-84', pieceName: 'Community Crest', design: 'Community Crest', buyer: '0x4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d28b9', amount: '20 HBAR', price: '20', campaign: 'Flood Relief', type: 'Logo', time: '6 hrs ago', status: 'completed', transactionHash: '0xcde012' },
]

export const emptySummaryMetrics = {
  totalDonations: { value: '0', subtext: 'HBAR', trend: 'No activity yet' },
  activeCampaigns: { value: 0, subtext: 'live', trend: 'No campaigns' },
  totalNgos: { value: 0, subtext: 'verified', trend: 'No NGOs yet' },
  totalDesigners: { value: 0, subtext: 'verified', trend: 'No designers yet' },
  pendingKycReviews: { value: 0, subtext: 'awaiting', trend: 'All clear' },
  openComplaints: { value: 0, subtext: 'unresolved', trend: 'All clear' },
}

export const emptyPlatformActivity = {
  donations: { today: 0, thisWeek: 0, newCampaigns: 0, completedCampaigns: 0, flaggedCampaigns: 0 },
  health: { transactionSuccessRate: 0, walletConnectionIssues: 0, avgApprovalTime: '—', systemStatus: 'All systems operational' },
}

export const managementNgos = [
  { id: 'ngo-1', name: 'GreenEarth Foundation', country: 'Kenya', wallet: '0x3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5b8c', status: 'approved', campaignsCount: 8, totalDonations: '45,200 HBAR', dateRegistered: '2024-01-15' },
  { id: 'ngo-2', name: 'Clean Oceans Initiative', country: 'Uganda', wallet: '0x9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c4e7', status: 'approved', campaignsCount: 5, totalDonations: '28,100 HBAR', dateRegistered: '2024-02-03' },
  { id: 'ngo-3', name: 'Tech for Good', country: 'Ghana', wallet: '0x7f5e4d3c2b1a0b9c8d7e6f5a4b3c2d1e0f9a2b9', status: 'approved', campaignsCount: 12, totalDonations: '62,400 HBAR', dateRegistered: '2024-03-10' },
  { id: 'ngo-4', name: 'HealthFirst NGO', country: 'Kenya', wallet: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0', status: 'pending', campaignsCount: 0, totalDonations: '0 HBAR', dateRegistered: '2024-04-01' },
  { id: 'ngo-5', name: 'EduCare Foundation', country: 'Tanzania', wallet: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1', status: 'pending', campaignsCount: 0, totalDonations: '0 HBAR', dateRegistered: '2024-04-05' },
  { id: 'ngo-6', name: 'FeedTomorrow', country: 'Nigeria', wallet: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2', status: 'approved', campaignsCount: 6, totalDonations: '19,500 HBAR', dateRegistered: '2024-02-20' },
  { id: 'ngo-7', name: 'Refugee Support Hub', country: 'Ethiopia', wallet: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3', status: 'rejected', campaignsCount: 0, totalDonations: '0 HBAR', dateRegistered: '2024-03-25' },
  { id: 'ngo-8', name: 'BuildHope', country: 'South Africa', wallet: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4', status: 'suspended', campaignsCount: 3, totalDonations: '8,200 HBAR', dateRegistered: '2024-01-28' },
]

export const managementCampaigns = [
  { id: 'c-1', title: 'Rural Healthcare Initiative', ngoName: 'HealthFirst NGO', status: 'active', amountRaised: 2450, target: 10000, donorsCount: 89, endDate: '2024-06-15', flagged: false },
  { id: 'c-2', title: 'Youth Education Program', ngoName: 'EduCare', status: 'active', amountRaised: 18200, target: 25000, donorsCount: 234, endDate: '2024-07-20', flagged: false },
  { id: 'c-3', title: 'Disaster Relief Fund', ngoName: 'HelpNow', status: 'active', amountRaised: 32100, target: 50000, donorsCount: 456, endDate: '2024-05-30', flagged: false },
  { id: 'c-4', title: 'Food Security Project', ngoName: 'FeedTomorrow', status: 'active', amountRaised: 12800, target: 15000, donorsCount: 178, endDate: '2024-06-10', flagged: false },
  { id: 'c-5', title: 'Shelter Construction', ngoName: 'BuildHope', status: 'completed', amountRaised: 30000, target: 30000, donorsCount: 512, endDate: '2024-04-01', flagged: false },
  { id: 'c-6', title: 'Clean Water Wells', ngoName: 'Clean Oceans Initiative', status: 'completed', amountRaised: 18000, target: 18000, donorsCount: 301, endDate: '2024-03-15', flagged: false },
  { id: 'c-7', title: 'Refugee Medical Aid', ngoName: 'Refugee Support Hub', status: 'flagged', amountRaised: 5200, target: 12000, donorsCount: 67, endDate: '2024-08-01', flagged: true },
  { id: 'c-8', title: 'Digital Literacy Program', ngoName: 'Tech for Good', status: 'paused', amountRaised: 8900, target: 20000, donorsCount: 124, endDate: '2024-07-05', flagged: false },
]

export const managementDesigners = [
  { id: 'd-1', name: 'Alex Chen', wallet: '0x7a3b2c1d4e5f6789012345678901234567890f2', status: 'approved', submittedCount: 24, approvedCount: 22, lastActivity: '2 hrs ago' },
  { id: 'd-2', name: 'Sarah Okafor', wallet: '0x8b4c3d2e1f0a9876543210987654321098761c3', status: 'approved', submittedCount: 18, approvedCount: 16, lastActivity: '5 hrs ago' },
  { id: 'd-3', name: 'Marcus Johnson', wallet: '0x2c1d4e5f67890123456789012345678901237d4', status: 'pending', submittedCount: 3, approvedCount: 0, lastActivity: '1 day ago' },
  { id: 'd-4', name: 'Priya Sharma', wallet: '0x9e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c12a1', status: 'approved', submittedCount: 31, approvedCount: 29, lastActivity: '30 min ago' },
  { id: 'd-5', name: 'David Kim', wallet: '0x4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d28b9', status: 'pending', submittedCount: 5, approvedCount: 0, lastActivity: '2 days ago' },
  { id: 'd-6', name: 'Emma Wilson', wallet: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b', status: 'rejected', submittedCount: 2, approvedCount: 0, lastActivity: '1 week ago' },
  { id: 'd-7', name: 'James Okello', wallet: '0x2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c', status: 'approved', submittedCount: 15, approvedCount: 14, lastActivity: '4 hrs ago' },
  { id: 'd-8', name: 'Luna Rodriguez', wallet: '0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d', status: 'suspended', submittedCount: 8, approvedCount: 6, lastActivity: '3 days ago' },
]
