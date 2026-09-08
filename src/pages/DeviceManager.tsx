import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Smartphone, Wifi, WifiOff, Plus, MessageSquare, Activity, MapPin, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { SignalBars } from "@/components/SignalBars";
import { SendMessageDialog } from "@/components/SendMessageDialog";


const ONLINE_WINDOW_MS = 20 * 60 * 1000;

const DeviceManager = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ device_name: "", device_id: "", phone_number: "" });

  const { data: rawDevices, isLoading } = useQuery({
    queryKey: ["devices-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const now = Date.now();
  const devices = rawDevices?.map((d) => {
    const last = d.last_sync_time ? new Date(d.last_sync_time).getTime() : 0;
    const isLive = last > 0 && now - last < ONLINE_WINDOW_MS;
    return { ...d, computed_online: isLive };
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("devices").insert({
        device_name: form.device_name,
        device_id: form.device_id,
        phone_number: form.phone_number || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices-manager"] });
      toast.success("Device registered");
      setForm({ device_name: "", device_id: "", phone_number: "" });
    },
    onError: (err: any) => {
      toast.error(err.message?.includes("duplicate") ? "Device ID already exists" : "Failed to register device");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Device Manager
            </h1>
            <p className="text-xs text-muted-foreground">Register devices by unique ID and monitor live status</p>
          </div>
          <Link to="/heartbeats">
            <Button variant="outline" size="sm"><Activity className="w-4 h-4 mr-1.5" />Heartbeats</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Register */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Register New Device</CardTitle>
            <CardDescription>Provide a unique Device ID — the Android app will use the same ID to send heartbeats and SMS.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dn">Device Name</Label>
              <Input id="dn" placeholder="My Phone" value={form.device_name} onChange={(e) => setForm(f => ({ ...f, device_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="di">Unique ID *</Label>
              <Input id="di" placeholder="phone-9839075329" value={form.device_id} onChange={(e) => setForm(f => ({ ...f, device_id: e.target.value }))} style={{ fontFamily: "var(--font-mono)" }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pn">Phone (optional)</Label>
              <Input id="pn" placeholder="98390..." value={form.phone_number} onChange={(e) => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!form.device_name || !form.device_id || addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {addMutation.isPending ? "Adding..." : "Register"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Devices list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Registered Devices</h2>
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">Loading...</p>
          ) : !devices?.length ? (
            <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">No devices yet</CardContent></Card>
          ) : (
            devices.map((d: any) => (
              <Card key={d.id} className="border border-border">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-foreground">{d.device_name}</p>
                    <p className="text-xs text-muted-foreground font-mono" style={{ fontFamily: "var(--font-mono)" }}>
                      ID: {d.device_id}{d.phone_number ? ` · ${d.phone_number}` : ""}
                    </p>
                    {d.latitude != null && d.longitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${d.latitude},${d.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <MapPin className="w-3 h-3" />
                        {Number(d.latitude).toFixed(5)}, {Number(d.longitude).toFixed(5)}
                        {d.location_accuracy ? ` (±${Math.round(d.location_accuracy)}m)` : ""}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> No location yet
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {d.computed_online ? (
                        <Badge className="bg-accent text-accent-foreground"><Wifi className="w-3 h-3 mr-1" />Online</Badge>
                      ) : (
                        <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        🔋 {d.power_level ?? 0}%
                      </span>
                    </div>
                    <SignalBars level={d.signal_strength} networkType={d.network_type} />
                    <span className="text-xs text-muted-foreground">
                      {d.last_sync_time ? format(new Date(d.last_sync_time), "MMM d, HH:mm:ss") : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/device/${d.id}/sms`}>
                      <Button variant="outline" size="sm"><MessageSquare className="w-3.5 h-3.5 mr-1.5" />SMS</Button>
                    </Link>
                    <Link to={`/device/${d.id}/media`}>
                      <Button variant="outline" size="sm"><Camera className="w-3.5 h-3.5 mr-1.5" />Media</Button>
                    </Link>
                    <SendMessageDialog deviceUuid={d.id} deviceName={d.device_name} />
                  </div>

                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceManager;
