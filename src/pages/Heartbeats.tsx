import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Wifi, WifiOff, BatteryCharging, Battery } from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

const ONLINE_WINDOW_MS = 20 * 60 * 1000; // 20 min

const Heartbeats = () => {
  const { data: rawDevices, isLoading } = useQuery({
    queryKey: ["heartbeats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("last_sync_time", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  const now = Date.now();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <Activity className="w-5 h-5 text-primary" />
              Heartbeat Monitor
            </h1>
            <p className="text-xs text-muted-foreground">Live check-in feed · refreshes every 3s · offline after 20 min of silence</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        <Card className="bg-muted/40 border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">How offline detection works</CardTitle>
            <CardDescription className="text-xs">
              The Android app sends a heartbeat every ~15 minutes. A device is marked <b>offline</b> if no heartbeat or
              SMS has been received within the last 20 minutes (grace window). Common reasons: phone is off, no internet,
              app killed by battery saver, or background restrictions.
            </CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading heartbeats...</p>
        ) : !rawDevices?.length ? (
          <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">No devices have checked in yet</CardContent></Card>
        ) : (
          rawDevices.map((d) => {
            const lastMs = d.last_sync_time ? new Date(d.last_sync_time).getTime() : 0;
            const ageMs = lastMs > 0 ? now - lastMs : Infinity;
            const isOnline = ageMs < ONLINE_WINDOW_MS;
            let reason = "Active and reachable";
            if (!isOnline) {
              if (lastMs === 0) reason = "Never checked in — app not installed or never launched";
              else if (ageMs < 60 * 60 * 1000) reason = "Heartbeat missed — possible network drop or app paused";
              else if (ageMs < 24 * 60 * 60 * 1000) reason = "Silent for over an hour — app likely killed or device sleeping";
              else reason = "Silent for over a day — phone off, uninstalled, or no connectivity";
            }

            return (
              <Card key={d.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1">
                        {isOnline ? (
                          <Badge className="bg-accent text-accent-foreground"><Wifi className="w-3 h-3 mr-1" />Online</Badge>
                        ) : (
                          <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>
                        )}
                        <span className="text-sm font-medium text-foreground">{d.device_name}</span>
                        <span className="text-xs text-muted-foreground font-mono" style={{ fontFamily: "var(--font-mono)" }}>
                          {d.device_id}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last check-in:{" "}
                        <span className="text-foreground font-medium">
                          {lastMs > 0 ? `${formatDistanceToNow(lastMs)} ago` : "Never"}
                        </span>
                        {lastMs > 0 && (
                          <span className="text-muted-foreground"> · {format(lastMs, "MMM d, HH:mm:ss")}</span>
                        )}
                      </p>
                      <p className={`text-xs mt-1 ${isOnline ? "text-accent" : "text-destructive"}`}>{reason}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {d.charger_status ? <BatteryCharging className="w-3.5 h-3.5 text-accent" /> : <Battery className="w-3.5 h-3.5" />}
                        {d.power_level ?? 0}%
                      </span>
                      <span>Screen: {d.screen_status || "—"}</span>
                      <span>SIM: {d.sms_card_status || "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Heartbeats;
