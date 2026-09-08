import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, MessageSquare, XCircle, Activity, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const DAYS = 14;
const ONLINE_WINDOW_MS = 20 * 60 * 1000;

const bytesToMB = (b: number) => Math.round((b / (1024 * 1024)) * 10) / 10;

const Analytics = () => {
  const since = subDays(startOfDay(new Date()), DAYS - 1).toISOString();

  const { data: devices } = useQuery({
    queryKey: ["analytics-devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*");
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: sms } = useQuery({
    queryKey: ["analytics-sms", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_messages")
        .select("id, device_id, received_at, created_at")
        .gte("created_at", since);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: cmds } = useQuery({
    queryKey: ["analytics-cmds", since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_commands")
        .select("id, device_id, command_status, created_at")
        .gte("created_at", since);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: media } = useQuery({
    queryKey: ["analytics-media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_media")
        .select("device_id, file_size, media_type");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Build day buckets
  const days = Array.from({ length: DAYS }).map((_, i) => {
    const d = subDays(startOfDay(new Date()), DAYS - 1 - i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "MMM d") };
  });

  const smsSeries = days.map((d) => {
    const count = sms?.filter((m: any) => format(new Date(m.created_at), "yyyy-MM-dd") === d.key).length ?? 0;
    return { day: d.label, count };
  });

  const cmdSeries = days.map((d) => {
    const dayCmds = cmds?.filter((c: any) => format(new Date(c.created_at), "yyyy-MM-dd") === d.key) ?? [];
    const failed = dayCmds.filter((c: any) => c.command_status === "failed").length;
    const success = dayCmds.filter((c: any) => c.command_status === "completed").length;
    return { day: d.label, failed, success };
  });

  const now = Date.now();
  const uptimeSeries = (devices ?? []).map((d: any) => {
    const last = d.last_sync_time ? new Date(d.last_sync_time).getTime() : 0;
    const online = last > 0 && now - last < ONLINE_WINDOW_MS;
    const minutesSinceSync = last > 0 ? Math.round((now - last) / 60000) : null;
    // Rough uptime score: 100 if online, else decays with minutes since last sync (max cap 24h)
    let score = 0;
    if (online) score = 100;
    else if (minutesSinceSync !== null) {
      const capped = Math.min(minutesSinceSync, 24 * 60);
      score = Math.max(0, Math.round(100 - (capped / (24 * 60)) * 100));
    }
    return { device: d.device_name || d.device_id, score, online };
  });

  const storageSeries = (devices ?? []).map((d: any) => {
    const items = media?.filter((m: any) => m.device_id === d.id) ?? [];
    const bytes = items.reduce((sum: number, m: any) => sum + (m.file_size || 0), 0);
    return { device: d.device_name || d.device_id, mb: bytesToMB(bytes), files: items.length };
  });

  const totals = {
    sms: sms?.length ?? 0,
    failed: cmds?.filter((c: any) => c.command_status === "failed").length ?? 0,
    onlineDevices: uptimeSeries.filter((u) => u.online).length,
    totalMB: storageSeries.reduce((s, x) => s + x.mb, 0),
  };

  const chartConfig = {
    count: { label: "SMS", color: "hsl(var(--primary))" },
    failed: { label: "Failed", color: "hsl(var(--destructive))" },
    success: { label: "Completed", color: "hsl(var(--primary))" },
    score: { label: "Uptime %", color: "hsl(var(--primary))" },
    mb: { label: "MB", color: "hsl(var(--primary))" },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Analytics</h1>
              <p className="text-xs text-muted-foreground">Last {DAYS} days</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={<MessageSquare className="w-4 h-4" />} label="SMS received" value={totals.sms} />
          <Kpi icon={<XCircle className="w-4 h-4" />} label="Failed commands" value={totals.failed} />
          <Kpi icon={<Activity className="w-4 h-4" />} label="Devices online" value={`${totals.onlineDevices}/${devices?.length ?? 0}`} />
          <Kpi icon={<HardDrive className="w-4 h-4" />} label="Media storage" value={`${totals.totalMB.toFixed(1)} MB`} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SMS volume</CardTitle>
              <CardDescription>Messages received per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <AreaChart data={smsSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Command outcomes</CardTitle>
              <CardDescription>Completed vs failed remote commands</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={cmdSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="success" stackId="a" fill="hsl(var(--primary))" radius={[0,0,0,0]} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Device uptime</CardTitle>
              <CardDescription>Current sync freshness per device</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={uptimeSeries} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="device" tick={{ fontSize: 11 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media storage per device</CardTitle>
              <CardDescription>Total MB uploaded from each device</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={storageSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="device" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="mb" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const Kpi = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} <span>{label}</span>
      </div>
      <div className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
    </CardContent>
  </Card>
);

export default Analytics;
