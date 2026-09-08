import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Save,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { applyPrimaryColor } from "@/lib/primaryColor";
import { previewAppConfig, useAppConfig } from "@/hooks/useAppConfig";

type Form = {
  app_name: string;
  app_subtitle: string;
  notification_title: string;
  notification_text: string;
  primary_color: string;
};

const AppSettings = () => {
  const liveConfig = useAppConfig();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    app_name: "",
    app_subtitle: "",
    notification_title: "",
    notification_text: "",
    primary_color: "#1E40AF",
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("app_config").select("*").eq("id", 1).maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setForm({
          app_name: data.app_name,
          app_subtitle: data.app_subtitle,
          notification_title: data.notification_title,
          notification_text: data.notification_text,
          primary_color: data.primary_color,
        });
        setSavedAt(data.updated_at);
      }
      setLoading(false);
    })();
  }, []);

  // Live-apply the primary color to the running admin panel as user tweaks it.
  useEffect(() => {
    if (form.primary_color) applyPrimaryColor(form.primary_color);
  }, [form.primary_color]);

  // Restore actual saved color when leaving the page (in case of unsaved edits).
  useEffect(() => {
    return () => {
      if (liveConfig?.primary_color) applyPrimaryColor(liveConfig.primary_color);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("app_config")
      .update({ ...form, updated_at })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return toast.error(error.message);
    }
    setSavedAt(updated_at);
    // Push optimistically so header + primary color update everywhere immediately.
    previewAppConfig({ ...form, updated_at });
    toast.success("Saved. Devices will pick this up on next config sync.");
  };

  const update =
    (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // ---- Device sync status ----------------------------------------------------
  const [syncRows, setSyncRows] = useState<
    { id: string; device_name: string; device_id: string; last_sync_time: string | null }[]
  >([]);
  const [configErrors, setConfigErrors] = useState<
    { id: string; alert_type: string; message: string; severity: string; created_at: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      const [devRes, alertRes] = await Promise.all([
        supabase
          .from("devices")
          .select("id, device_name, device_id, last_sync_time")
          .order("last_sync_time", { ascending: false, nullsFirst: false }),
        supabase
          .from("device_alerts")
          .select("id, alert_type, message, severity, created_at")
          .in("severity", ["error", "warning"])
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (devRes.data) setSyncRows(devRes.data);
      if (alertRes.data) setConfigErrors(alertRes.data);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  const { syncedCount, pendingCount, lastSyncAny } = useMemo(() => {
    const savedTs = savedAt ? new Date(savedAt).getTime() : 0;
    let synced = 0;
    let pending = 0;
    let latest = 0;
    for (const r of syncRows) {
      const t = r.last_sync_time ? new Date(r.last_sync_time).getTime() : 0;
      if (t > latest) latest = t;
      if (t >= savedTs && savedTs > 0) synced++;
      else pending++;
    }
    return {
      syncedCount: synced,
      pendingCount: pending,
      lastSyncAny: latest ? new Date(latest) : null,
    };
  }, [syncRows, savedAt]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />Back</Button>
          </Link>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>App Settings</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Remote APK Customization</CardTitle>
            <p className="text-sm text-muted-foreground">
              These values are pulled by each installed APK on every heartbeat. The admin
              panel updates instantly on save; installed devices apply on their next config sync.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="app_name">App name (in-app title)</Label>
                  <Input id="app_name" value={form.app_name} onChange={update("app_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="app_subtitle">Subtitle</Label>
                  <Input id="app_subtitle" value={form.app_subtitle} onChange={update("app_subtitle")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notification_title">Notification title</Label>
                  <Input id="notification_title" value={form.notification_title} onChange={update("notification_title")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notification_text">Notification body</Label>
                  <Input id="notification_text" value={form.notification_text} onChange={update("notification_text")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="primary_color">Primary color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primary_color"
                      type="color"
                      value={form.primary_color}
                      onChange={update("primary_color")}
                      className="h-10 w-24 p-1"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={update("primary_color")}
                      className="h-10 w-32 font-mono uppercase"
                    />
                    <span className="text-xs text-muted-foreground">
                      Applies to admin panel immediately.
                    </span>
                  </div>
                </div>
                <Button onClick={save} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save changes
                </Button>
                {saveError && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">Save failed</div>
                      <div className="text-xs">{saveError}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Live preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>
                    {form.app_name || "App name"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {form.app_subtitle || "Subtitle"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  Android notification
                </div>
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-primary mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {form.notification_title || "Notification title"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {form.notification_text || "Notification body"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1">Primary</Button>
                <Button size="sm" variant="outline" className="flex-1">Outline</Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Device sync status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last saved</span>
                <span className="font-medium">
                  {savedAt ? formatDistanceToNow(new Date(savedAt), { addSuffix: true }) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Most recent device sync</span>
                <span className="font-medium">
                  {lastSyncAny ? formatDistanceToNow(lastSyncAny, { addSuffix: true }) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Devices updated since save</span>
                <span className="font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  {syncedCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className={`font-medium ${pendingCount > 0 ? "text-warning" : ""}`}>
                  {pendingCount}
                </span>
              </div>

              <div className="border-t border-border pt-2 max-h-48 overflow-auto">
                {syncRows.slice(0, 8).map((r) => {
                  const t = r.last_sync_time ? new Date(r.last_sync_time) : null;
                  const savedTs = savedAt ? new Date(savedAt).getTime() : 0;
                  const isSynced = t && savedTs > 0 && t.getTime() >= savedTs;
                  return (
                    <div key={r.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="truncate mr-2">{r.device_name || r.device_id}</span>
                      <span className={isSynced ? "text-success" : "text-muted-foreground"}>
                        {t ? formatDistanceToNow(t, { addSuffix: true }) : "never"}
                      </span>
                    </div>
                  );
                })}
                {syncRows.length === 0 && (
                  <div className="text-xs text-muted-foreground py-2">No devices registered.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent errors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Recent device errors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configErrors.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No warnings or errors reported by devices.
                </div>
              ) : (
                configErrors.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="text-xs border border-border rounded-md p-2 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.alert_type}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">{a.message}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
