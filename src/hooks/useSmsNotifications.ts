import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSmsNotifications = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification sound
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipOQfWRYXHqMkYx7Z1xjcoyXlId4bmR0hJCUj4N4cHB+jJGTj4V6c3N9iI+Rj4V7dHR8ho6QjoR6c3V9ho2PjYN5cnR8hYyOjIN5cnN7hIyNi4J4cXJ6g4uMi4F3cHF5goqLioB2b3B4gYmKiX91bnB3gIiJiH50bW93f4eIh310bG52foaHhn1zbGx1fYWGhXxybGt0fISFhHtxamtz");
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("sms-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sms_messages",
        },
        (payload) => {
          const msg = payload.new as any;
          
          // Play sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }

          // Show toast
          toast.info(`New SMS from ${msg.sender || "Unknown"}`, {
            description: msg.message_body?.substring(0, 100) || "New message received",
            duration: 8000,
          });

          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("SMS - New Message", {
              body: `From: ${msg.sender || "Unknown"}\n${msg.message_body?.substring(0, 100) || ""}`,
              icon: "/icon-192.png",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
