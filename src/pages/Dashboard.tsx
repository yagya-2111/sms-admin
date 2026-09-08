import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Plus, Smartphone, Wifi, WifiOff, Zap, MessageSquare, Settings, LogOut, Search, Bell, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { clearAdminSession } from "@/lib/adminAccess";
import { format } from "date-fns";
import { useSmsNotifications } from "@/hooks/useSmsNotifications";
import { useAlertMonitor } from "@/hooks/useAlertMonitor";
import { useAppConfig } from "@/hooks/useAppConfig";

const Dashboard = () => {
  useSmsNotifications();
  useAlertMonitor();
  const appConfig = useAppConfig();
  const queryClient = useQueryClient();

  // A device is considered online if it sent a heartbeat within this window.
  const ONLINE_WINDOW_MS = 20 * 60 * 1000; // 20 min (heartbeats run every ~15 min)

  const { data: rawDevices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  // Derive live online status from last_sync_time so the dashboard reflects
  // real connectivity even between heartbeats / when the phone goes offline.
  const now = Date.now();
  const devices = rawDevices?.map((d) => {
    const last = d.last_sync_time ? new Date(d.last_sync_time).getTime() : 0;
    const isLive = last > 0 && now - last < ONLINE_WINDOW_MS;
    return { ...d, online_status: isLive ? "online" : "offline" };
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onSuccess: () => toast.success("Refresh Success"),
  });

  const toggleForwarding = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase.from("devices").update({ is_forwarding: !current }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Forwarding status updated");
    },
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device removed");
    },
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary shadow-md shadow-primary/25 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {appConfig?.app_name || " SMS"}
              </h1>
              <p className="text-xs text-muted-foreground">{appConfig?.app_subtitle || "Device Management Panel"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate()}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/alerts">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-1.5" />
                Alerts
              </Button>
            </Link>
            <Link to="/analytics">
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Analytics
              </Button>
            </Link>
            <Link to="/sms-search">
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-1.5" />
                SMS Search
              </Button>
            </Link>
            <Link to="/heartbeats">
              <Button variant="outline" size="sm">
                <Wifi className="w-4 h-4 mr-1.5" />
                Heartbeats
              </Button>
            </Link>
            <Link to="/api-setup">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1.5" />
                API Setup
              </Button>
            </Link>
            <Link to="/app-settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1.5" />
                App Settings
              </Button>
            </Link>
            <Link to="/devices">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Manage Devices
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => {
              clearAdminSession();
              window.location.href = "/admin-login";
            }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Devices", value: devices?.length ?? 0, icon: Smartphone, color: "text-primary" },
            { label: "Online", value: devices?.filter(d => d.online_status === "online").length ?? 0, icon: Wifi, color: "text-accent" },
            { label: "Offline", value: devices?.filter(d => d.online_status !== "online").length ?? 0, icon: WifiOff, color: "text-destructive" },
            { label: "Forwarding", value: devices?.filter(d => d.is_forwarding).length ?? 0, icon: Zap, color: "text-warning" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/80 shadow-sm rounded-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/80 flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Device Cards */}
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading devices...</div>
        ) : !devices?.length ? (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="py-16 text-center">
              <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No devices added yet</p>
              <Link to="/add-device">
                <Button><Plus className="w-4 h-4 mr-1.5" />Add Your First Device</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <Card key={device.id} className="border-border/80 overflow-hidden rounded-xl shadow-sm">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] divide-y md:divide-y-0 md:divide-x divide-border">
                    {/* Device Info */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{device.device_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>📱 Phone: <span className="text-foreground font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{device.phone_number || "—"}</span></p>
                        <p>🆔 Device: <span className="text-foreground font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{device.device_id}</span></p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-muted-foreground">SMS Card Status: <span className="text-primary">{device.sms_card_status}</span></p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Online:</span>
                        <Badge variant={device.online_status === "online" ? "default" : "destructive"} className="text-xs">
                          {device.online_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Power: <span className="text-foreground font-medium">{device.power_level}%</span>
                        {" · "}Charger: <span className="text-foreground font-medium">{device.charger_status ? "Yes" : "No"}</span>
                      </p>
                    </div>

                    {/* Sync & Remark */}
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Last Sync: <span className="text-foreground">{device.last_sync_time ? format(new Date(device.last_sync_time), "yyyy-MM-dd HH:mm:ss") : "Never"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Screen: <span className="text-foreground">{device.screen_status}</span>
                      </p>
                      {device.remark && (
                        <p className="text-xs text-muted-foreground">
                          Remark: <span className="text-foreground">{device.remark}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 flex flex-col gap-2 justify-center min-w-[160px]">
                      <Link to={`/device/${device.id}/sms`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          View SMS
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={device.is_forwarding ? "destructive" : "default"}
                        className="w-full"
                        onClick={() => toggleForwarding.mutate({ id: device.id, current: !!device.is_forwarding })}
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        {device.is_forwarding ? "Stop Forward" : "Start Forward"}
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => deleteDevice.mutate(device.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
