import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ONLINE_WINDOW_MS = 20 * 60 * 1000;
const LOW_BATTERY = 15;
const STORAGE_KEY = "device_alert_state_v1";

type DeviceState = {
  online: boolean;
  battery: number;
  sim: string;
};

type StoredState = Record<string, DeviceState>;

const loadState = (): StoredState => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveState = (s: StoredState) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

/**
 * Watches devices and inserts rows into `device_alerts` when a device
 * transitions online<->offline, has low battery, SIM issues, or other anomalies.
 * Uses localStorage to dedupe across refreshes.
 */
export const useAlertMonitor = () => {
  const initialized = useRef(false);

  const { data: devices } = useQuery({
    queryKey: ["alert-monitor-devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*");
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!devices) return;
    const state = loadState();
    const now = Date.now();
    const alertsToInsert: any[] = [];

    for (const d of devices) {
      const last = d.last_sync_time ? new Date(d.last_sync_time).getTime() : 0;
      const online = last > 0 && now - last < ONLINE_WINDOW_MS;
      const battery = Number(d.power_level) || 0;
      const sim = d.sms_card_status || "uncertain";
      const prev = state[d.id];

      if (initialized.current && prev) {
        if (prev.online && !online) {
          alertsToInsert.push({
            device_id: d.id,
            alert_type: "offline",
            severity: "critical",
            message: `${d.device_name} went offline`,
            metadata: { last_sync_time: d.last_sync_time, battery, sim },
          });
        }
        if (!prev.online && online) {
          alertsToInsert.push({
            device_id: d.id,
            alert_type: "back_online",
            severity: "info",
            message: `${d.device_name} is back online`,
            metadata: { battery, sim },
          });
        }
        if (prev.battery > LOW_BATTERY && battery <= LOW_BATTERY && battery > 0) {
          alertsToInsert.push({
            device_id: d.id,
            alert_type: "low_battery",
            severity: "warning",
            message: `${d.device_name} battery low (${battery}%)`,
            metadata: { battery, charger: d.charger_status },
          });
        }
        if (prev.sim !== "error" && sim === "error") {
          alertsToInsert.push({
            device_id: d.id,
            alert_type: "sim_issue",
            severity: "warning",
            message: `${d.device_name} SIM card reported an error`,
            metadata: { sim },
          });
        }
      }

      state[d.id] = { online, battery, sim };
    }

    saveState(state);
    initialized.current = true;

    if (alertsToInsert.length > 0) {
      supabase.from("device_alerts").insert(alertsToInsert).then(({ error }) => {
        if (error) console.error("alert insert failed", error);
      });
    }
  }, [devices]);
};
