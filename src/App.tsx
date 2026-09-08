import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminRoute from "./components/AdminRoute";
import Dashboard from "./pages/Dashboard";
import AddDevice from "./pages/AddDevice";
import DeviceManager from "./pages/DeviceManager";
import DeviceMedia from "./pages/DeviceMedia";
import Heartbeats from "./pages/Heartbeats";
import DeviceSms from "./pages/DeviceSms";
import ApiSetup from "./pages/ApiSetup";
import PhoneDashboard from "./pages/PhoneDashboard";
import SmsSearch from "./pages/SmsSearch";
import AdminLogin from "./pages/AdminLogin";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import AppSettings from "./pages/AppSettings";
import NotFound from "./pages/NotFound";
import { useAppConfig } from "./hooks/useAppConfig";

const AppConfigLoader = () => {
  useAppConfig();
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppConfigLoader />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/phone" element={<PhoneDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/add-device" element={<AdminRoute><AddDevice /></AdminRoute>} />
          <Route path="/devices" element={<AdminRoute><DeviceManager /></AdminRoute>} />
          <Route path="/device/:deviceId/media" element={<AdminRoute><DeviceMedia /></AdminRoute>} />
          <Route path="/heartbeats" element={<AdminRoute><Heartbeats /></AdminRoute>} />
          <Route path="/device/:deviceId/sms" element={<AdminRoute><DeviceSms /></AdminRoute>} />
          <Route path="/api-setup" element={<AdminRoute><ApiSetup /></AdminRoute>} />
          <Route path="/sms-search" element={<AdminRoute><SmsSearch /></AdminRoute>} />
          <Route path="/alerts" element={<AdminRoute><Alerts /></AdminRoute>} />
          <Route path="/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
          <Route path="/app-settings" element={<AdminRoute><AppSettings /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
