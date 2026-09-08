import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { MessageCircle, Send, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  deviceUuid: string;
  deviceName: string;
  variant?: "outline" | "default";
  size?: "sm" | "default";
}

export function SendMessageDialog({ deviceUuid, deviceName, variant = "outline", size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const qc = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ["device-messages", deviceUuid],
    enabled: open,
    refetchInterval: open ? 5000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_messages")
        .select("id, body, created_at, delivered_at, read_at")
        .eq("device_id", deviceUuid)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("device_messages").insert({
        device_id: deviceUuid,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message queued for delivery");
      setBody("");
      qc.invalidateQueries({ queryKey: ["device-messages", deviceUuid] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to send"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Send Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send message to {deviceName}</DialogTitle>
          <DialogDescription>
            The device shows a full-screen popup with an alert sound.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="Type your message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!body.trim() || send.isPending}
            onClick={() => send.mutate()}
          >
            <Send className="w-4 h-4 mr-1.5" />
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>

        <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground">Recent (last 10)</p>
          {!history?.length ? (
            <p className="text-xs text-muted-foreground italic">No messages yet</p>
          ) : (
            history.map((m: any) => (
              <div key={m.id} className="border rounded-md p-2 text-xs space-y-1">
                <p className="text-foreground">{m.body}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{format(new Date(m.created_at), "MMM d, HH:mm")}</span>
                  {m.read_at ? (
                    <span className="inline-flex items-center gap-0.5 text-green-600"><CheckCheck className="w-3 h-3" /> Read</span>
                  ) : m.delivered_at ? (
                    <span className="inline-flex items-center gap-0.5 text-blue-600"><Check className="w-3 h-3" /> Delivered</span>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
