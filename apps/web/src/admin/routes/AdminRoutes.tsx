import { Route, Navigate } from 'react-router-dom'
import AdminLayout from '../layout/AdminLayout'
import AdminPrivateRoute from '../components/AdminPrivateRoute'
import Dashboard from '../pages/Dashboard'
import NgoManagement from '../pages/NgoManagement'
import CampaignManagement from '../pages/CampaignManagement'
import DesignerManagement from '../pages/DesignerManagement'
import KycReview from '../pages/KycReview'
import Complaints from '../pages/Complaints'
import Transactions from '../pages/Transactions'

export const adminRoutes = (
  <Route path="/admin" element={<AdminPrivateRoute><AdminLayout /></AdminPrivateRoute>}>
    <Route index element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="ngos" element={<NgoManagement />} />
    <Route path="campaigns" element={<CampaignManagement />} />
    <Route path="designers" element={<DesignerManagement />} />
    <Route path="kyc-review" element={<KycReview />} />
    <Route path="complaints" element={<Complaints />} />
    <Route path="transactions" element={<Transactions />} />
  </Route>
)

export default adminRoutes
