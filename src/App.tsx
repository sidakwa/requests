import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import NewRequest from "@/pages/NewRequest"
import ApprovalsInbox from "@/pages/ApprovalsInbox"
import Reports from "@/pages/Reports"
import Admin from "@/pages/Admin"
import ViewRequest from "@/pages/ViewRequest"

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-request" element={<NewRequest />} />
          <Route path="/approvals" element={<ApprovalsInbox />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/request/:id" element={<ViewRequest />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
