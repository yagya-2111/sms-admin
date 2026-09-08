import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyPrimaryColor } from "@/lib/primaryColor";

export type AppConfig = {
  app_name: string;
  app_subtitle: string;
  notification_title: string;
  notification_text: string;
  primary_color: string;
  updated_at: string;
};

let cached: AppConfig | null = null;
const listeners = new Set<(c: AppConfig) => void>();

function emit(c: AppConfig) {
  cached = c;
  applyPrimaryColor(c.primary_color);
  listeners.forEach((l) => l(c));
}

let started = false;
function start() {
  if (started) return;
  started = true;
  supabase
    .from("app_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle()
    .then(({ data }) => data && emit(data as AppConfig));
  supabase
    .channel("app_config_live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_config" },
      (payload) => payload.new && emit(payload.new as AppConfig),
    )
    .subscribe();
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(cached);
  useEffect(() => {
    start();
    const l = (c: AppConfig) => setConfig(c);
    listeners.add(l);
    if (cached) setConfig(cached);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return config;
}

// Optimistically push a config update to all subscribers (for live preview).
export function previewAppConfig(patch: Partial<AppConfig>) {
  const base = cached ?? {
    app_name: "",
    app_subtitle: "",
    notification_title: "",
    notification_text: "",
    primary_color: "#1E40AF",
    updated_at: new Date().toISOString(),
  };
  emit({ ...base, ...patch });
}
