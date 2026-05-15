import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import MyRequests from "@/pages/MyRequests";
import NewRequest from "@/pages/NewRequest";
import ViewRequest from "@/pages/ViewRequest";
import ApprovalsInbox from "@/pages/ApprovalsInbox";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";

export default function App() {
  return (
    <HashRouter>
      <Toaster richColors position="top-right" />
      <Layout>
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/new"         element={<NewRequest />} />
          <Route path="/request/:id" element={<ViewRequest />} />
          <Route path="/inbox"       element={<ApprovalsInbox />} />
          <Route path="/reports"     element={<Reports />} />
          <Route path="/admin"       element={<Admin />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
