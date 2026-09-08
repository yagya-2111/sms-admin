import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, CheckCircle, XCircle, Loader2, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sms-receiver`;

type DeviceStatus = "idle" | "running" | "stopped" | "error";

const PhoneDashboard = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<DeviceStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    readSms: false,
    notification: false,
    batteryOptimization: false,
    backgroundRun: false,
  });
  const [deviceInfo, setDeviceInfo] = useState<{
    phone: string;
    lastSync: string;
    uuid: string;
    onlineStatus: string;
    powerLevel: number;
  } | null>(null);

  // Restore saved state
  useEffect(() => {
    const saved = localStorage.getItem("skypay_phone_device");
    if (saved) {
      const parsed = JSON.parse(saved);
      setPhoneNumber(parsed.phoneNumber || "");
      setDeviceId(parsed.deviceId || null);
      setDeviceUuid(parsed.uuid || null);
      setPermissions(parsed.permissions || {
        readSms: false, notification: false, batteryOptimization: false, backgroundRun: false,
      });
      if (parsed.deviceId) {
        setStatus("running");
      }
    }
  }, []);

  // Real-time subscription to device updates
  useEffect(() => {
    if (!deviceUuid) return;

    // Initial fetch
    const fetchDevice = async () => {
      const { data } = await supabase
        .from("devices")
        .select("*")
        .eq("id", deviceUuid)
        .maybeSingle();
      if (data) {
        setDeviceInfo({
          phone: data.phone_number || phoneNumber,
          lastSync: data.last_sync_time || "",
          uuid: data.id,
          onlineStatus: data.online_status || "offline",
          powerLevel: data.power_level ?? 0,
        });
      }
    };
    fetchDevice();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`device-${deviceUuid}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "devices",
          filter: `id=eq.${deviceUuid}`,
        },
        (payload) => {
          const d = payload.new as any;
          setDeviceInfo({
            phone: d.phone_number || phoneNumber,
            lastSync: d.last_sync_time || "",
            uuid: d.id,
            onlineStatus: d.online_status || "offline",
            powerLevel: d.power_level ?? 0,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceUuid, phoneNumber]);

  // Heartbeat interval when running
  useEffect(() => {
    if (status !== "running" || !deviceId) return;

    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`${BASE_URL}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceId,
            device_name: `Phone-${phoneNumber.slice(-4)}`,
            phone_number: phoneNumber,
            online_status: "online",
            power_level: Math.round(Math.random() * 30 + 70),
            charger_status: false,
            screen_status: "on",
            sms_card_status: permissions.readSms ? "normal" : "denied",
          }),
        });
        const data = await res.json();
        if (data.success && data.device_uuid) {
          setDeviceUuid(data.device_uuid);
          saveState({ uuid: data.device_uuid });
        }
      } catch {
        // silent
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [status, deviceId, phoneNumber, permissions.readSms]);

  const saveState = (extra: Record<string, any> = {}) => {
    const current = JSON.parse(localStorage.getItem("skypay_phone_device") || "{}");
    localStorage.setItem(
      "skypay_phone_device",
      JSON.stringify({ ...current, phoneNumber, deviceId, permissions, ...extra })
    );
  };

  const togglePermission = (key: keyof typeof permissions) => {
    if (key === "notification" && !permissions.notification) {
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission().then((result) => {
          if (result === "granted") {
            setPermissions((p) => {
              const updated = { ...p, notification: true };
              saveState({ permissions: updated });
              return updated;
            });
            toast.success("Notification permission granted");
          } else {
            toast.error("Notification permission denied by browser");
          }
        });
        return;
      }
    }

    setPermissions((p) => {
      const updated = { ...p, [key]: !p[key] };
      saveState({ permissions: updated });
      return updated;
    });

    if (!permissions[key]) {
      toast.success(`${key === "readSms" ? "SMS Read" : key === "batteryOptimization" ? "Battery Optimization" : key === "backgroundRun" ? "Background Run" : "Notification"} enabled`);
    }
  };

  const allPermissionsGranted = permissions.readSms && permissions.notification && permissions.batteryOptimization && permissions.backgroundRun;

  const handleStart = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (!permissions.readSms) {
      toast.error("Please enable SMS Read permission first");
      return;
    }

    setLoading(true);
    const newDeviceId = `phone-${phoneNumber.replace(/\D/g, "")}`;

    try {
      const res = await fetch(`${BASE_URL}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: newDeviceId,
          device_name: `Phone-${phoneNumber.slice(-4)}`,
          phone_number: phoneNumber,
          online_status: "online",
          power_level: 100,
          charger_status: false,
          screen_status: "on",
          sms_card_status: "normal",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDeviceId(newDeviceId);
        setDeviceUuid(data.device_uuid);
        setStatus("running");
        localStorage.setItem(
          "skypay_phone_device",
          JSON.stringify({
            phoneNumber,
            deviceId: newDeviceId,
            uuid: data.device_uuid,
            permissions,
          })
        );
        toast.success("Device registered! SMS forwarding started.");
      } else {
        toast.error(data.error || "Failed to register device");
        setStatus("error");
      }
    } catch (err: any) {
      toast.error("Connection failed: " + err.message);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!deviceId) return;
    try {
      await fetch(`${BASE_URL}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          device_name: `Phone-${phoneNumber.slice(-4)}`,
          phone_number: phoneNumber,
          online_status: "offline",
          power_level: 0,
          screen_status: "off",
          sms_card_status: "normal",
        }),
      });
    } catch {
      // silent
    }
    setStatus("stopped");
    setDeviceId(null);
    setDeviceUuid(null);
    setDeviceInfo(null);
    localStorage.removeItem("skypay_phone_device");
    toast.info("SMS forwarding stopped.");
  };

  const handleCheck = async () => {
    if (!deviceId) {
      toast.error("Start forwarding first");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          device_name: `Phone-${phoneNumber.slice(-4)}`,
          phone_number: phoneNumber,
          online_status: "online",
          power_level: 85,
          screen_status: "on",
          sms_card_status: permissions.readSms ? "normal" : "denied",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Connection OK! Device is online.");
      } else {
        toast.error("Check failed");
      }
    } catch {
      toast.error("Connection failed");
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("skypay_phone_device");
    setPhoneNumber("");
    setDeviceId(null);
    setDeviceUuid(null);
    setStatus("idle");
    setDeviceInfo(null);
    setPermissions({ readSms: false, notification: false, batteryOptimization: false, backgroundRun: false });
    toast.success("Cache cleared");
  };

  const PermissionRow = ({
    label,
    enabled,
    onToggle,
  }: {
    label: string;
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm font-medium text-foreground">{label}:</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${enabled ? "text-green-600" : "text-red-500"}`}>
          {enabled ? "normal" : "denied"}
        </span>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center px-4 py-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-1 mb-6">
        <div className="flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
             SMS
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">SMS Forwarding Dashboard</p>
        <Link to="/dashboard" className="mt-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Admin Panel
          </Button>
        </Link>
      </div>

      {/* Phone Number Input */}
      <Card className="w-full max-w-sm mb-4 border-2 border-blue-200">
        <CardContent className="pt-5 space-y-4">
          <label className="text-sm font-medium text-muted-foreground">
            Enter Phone Number
          </label>
          <Input
            type="tel"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="text-lg font-semibold h-12"
            disabled={status === "running"}
          />

          {status !== "running" ? (
            <Button
              onClick={handleStart}
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700"
              disabled={loading || !permissions.readSms}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {!permissions.readSms ? "Enable SMS Permission to Start" : "Start"}
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              className="w-full h-12 text-base font-bold bg-red-600 hover:bg-red-700"
            >
              Stop
            </Button>
          )}

          <div className="flex gap-3">
            <Button onClick={handleCheck} variant="default" className="flex-1 h-10 font-bold bg-blue-600 hover:bg-blue-700">
              Check
            </Button>
            <Button onClick={handleClearCache} variant="default" className="flex-1 h-10 font-bold bg-blue-600 hover:bg-blue-700">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card className="w-full max-w-sm mb-4 border border-border">
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-foreground mb-3">Permissions</h2>
          <PermissionRow label="Read SMS" enabled={permissions.readSms} onToggle={() => togglePermission("readSms")} />
          <PermissionRow label="Notification" enabled={permissions.notification} onToggle={() => togglePermission("notification")} />
          <PermissionRow label="Battery Optimization" enabled={permissions.batteryOptimization} onToggle={() => togglePermission("batteryOptimization")} />
          <PermissionRow label="Background Run" enabled={permissions.backgroundRun} onToggle={() => togglePermission("backgroundRun")} />
          {!allPermissionsGranted && (
            <p className="text-xs text-amber-600 mt-2">⚠️ Enable all permissions for full SMS forwarding</p>
          )}
        </CardContent>
      </Card>

      {/* Device Status - Real-time from DB */}
      <Card className="w-full max-w-sm border border-border">
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-foreground mb-3">Device Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${
                status === "running" ? "text-green-600" : status === "error" ? "text-red-500" : "text-muted-foreground"
              }`}>
                {status === "running" ? <CheckCircle className="w-4 h-4" /> : status === "error" ? <XCircle className="w-4 h-4" /> : null}
                {status === "running" ? "Running" : status === "error" ? "Error" : status === "stopped" ? "Stopped" : "Idle"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phone:</span>
              <span className="text-sm font-medium text-foreground">{deviceInfo?.phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Online:</span>
              <span className={`text-sm font-medium ${deviceInfo?.onlineStatus === "online" ? "text-green-600" : "text-red-500"}`}>
                {deviceInfo?.onlineStatus || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Power:</span>
              <span className="text-sm font-medium text-foreground">{deviceInfo?.powerLevel ? `${deviceInfo.powerLevel}%` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Sync:</span>
              <span className="text-sm font-medium text-foreground">
                {deviceInfo?.lastSync ? new Date(deviceInfo.lastSync).toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Device ID:</span>
              <span className="text-xs font-mono text-muted-foreground break-all">{deviceId || "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default PhoneDashboard;
