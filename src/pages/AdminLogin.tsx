import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { hasAdminAccess, isAdminEmail, setAdminSession } from "@/lib/adminAccess";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (hasAdminAccess()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEnter = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    if (!isAdminEmail(trimmed)) {
      toast.error("This email is not set as admin");
      setLoading(false);
      return;
    }
    setAdminSession(trimmed);
    toast.success("Welcome back, Admin!");
    navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border/80 shadow-xl shadow-primary/5 rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-sky-400 to-primary" />
        <CardHeader className="text-center pt-8 pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
             SMS Admin
          </CardTitle>
          <p className="text-sm text-muted-foreground pt-1">Enter the admin email to continue</p>
        </CardHeader>
        <CardContent className="space-y-5 px-8 pb-8 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@gmail.com"
              className="h-11 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            />
          </div>
          <Button className="w-full h-11 rounded-xl text-sm font-semibold" onClick={handleEnter} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enter Admin Panel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
