import { Navigate } from "react-router-dom";
import { hasAdminAccess } from "@/lib/adminAccess";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  if (!hasAdminAccess()) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
