import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, WifiOff, Wifi, BatteryLow, Signal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { useAlertMonitor } from "@/hooks/useAlertMonitor";
import { toast } from "sonner";
import { useEffect } from "react";

const iconFor = (type: string) => {
  switch (type) {
    case "offline": return <WifiOff className="w-4 h-4" />;
    case "back_online": return <Wifi className="w-4 h-4" />;
    case "low_battery": return <BatteryLow className="w-4 h-4" />;
    case "sim_issue": return <Signal className="w-4 h-4" />;
    default: return <AlertTriangle className="w-4 h-4" />;
  }
};

const severityColor = (sev: string) => {
  if (sev === "critical") return "bg-destructive/15 text-destructive border-destructive/30";
  if (sev === "warning") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  return "bg-primary/10 text-primary border-primary/30";
};

const Alerts = () => {
  useAlertMonitor();
  const qc = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["device-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_alerts")
        .select("*, devices(device_name, device_id)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("alerts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "device_alerts" }, () => {
        qc.invalidateQueries({ queryKey: ["device-alerts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_alerts").update({ acknowledged: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["device-alerts"] }),
  });

  const ackAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("device_alerts").update({ acknowledged: true }).eq("acknowledged", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device-alerts"] });
      toast.success("All alerts acknowledged");
    },
  });

  const clearOld = useMutation({
    mutationFn: async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("device_alerts").delete().lt("created_at", cutoff);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device-alerts"] });
      toast.success("Cleared alerts older than 7 days");
    },
  });

  const unackCount = alerts?.filter((a: any) => !a.acknowledged).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Alerts & Timeline</h1>
              <p className="text-xs text-muted-foreground">{unackCount} unacknowledged</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => ackAll.mutate()} disabled={unackCount === 0}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Ack all
            </Button>
            <Button variant="outline" size="sm" onClick={() => clearOld.mutate()}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear old
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && (!alerts || alerts.length === 0) && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No alerts yet. Events will appear here when devices go offline or misbehave.
              </div>
            )}
            <div className="relative">
              {alerts && alerts.length > 0 && (
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
              )}
              <ul className="space-y-3">
                {alerts?.map((a: any) => (
                  <li key={a.id} className="relative pl-10">
                    <div className={`absolute left-2 top-2 w-5 h-5 rounded-full border flex items-center justify-center ${severityColor(a.severity)}`}>
                      {iconFor(a.alert_type)}
                    </div>
                    <div className={`p-3 rounded-lg border ${a.acknowledged ? "bg-muted/30" : "bg-card"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{a.message}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{a.alert_type.replace("_", " ")}</Badge>
                            {a.acknowledged && <Badge variant="secondary" className="text-[10px]">Acked</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {a.devices?.device_name || "Unknown device"}
                            {a.devices?.device_id && <span className="ml-1 opacity-70">({a.devices.device_id})</span>}
                            <span className="mx-1">·</span>
                            <span title={format(new Date(a.created_at), "PPpp")}>
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {!a.acknowledged && (
                          <Button size="sm" variant="ghost" onClick={() => ackMutation.mutate(a.id)}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Alerts;
