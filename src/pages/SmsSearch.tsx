import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, MessageSquare, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useSmsNotifications } from "@/hooks/useSmsNotifications";

const SmsSearch = () => {
  useSmsNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    clearTimeout((window as any).__smsSearchTimer);
    (window as any).__smsSearchTimer = setTimeout(() => setDebouncedQuery(value), 300);
  };

  const { data: devices } = useQuery({
    queryKey: ["devices-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, device_name, phone_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["sms-search", debouncedQuery, filterDevice],
    queryFn: async () => {
      let query = supabase
        .from("sms_messages")
        .select("*, devices(device_name, phone_number)")
        .order("received_at", { ascending: false })
        .limit(100);

      if (filterDevice && filterDevice !== "all") {
        query = query.eq("device_id", filterDevice);
      }

      if (debouncedQuery.trim()) {
        query = query.or(`sender.ilike.%${debouncedQuery}%,message_body.ilike.%${debouncedQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">SMS Search</h1>
              <p className="text-xs text-muted-foreground">Search all messages by sender or content</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {messages?.length ?? 0} results
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by sender number or message content..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-[200px] h-11">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.device_name} ({d.phone_number || "—"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Searching...</div>
        ) : !messages?.length ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {debouncedQuery ? `No messages matching "${debouncedQuery}"` : "No SMS messages found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages.map((msg: any) => (
              <Card key={msg.id} className="border border-border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {msg.sender || "Unknown"}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {msg.devices?.device_name || "—"}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80 break-words whitespace-pre-wrap">
                        {msg.message_body || "—"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {msg.received_at ? format(new Date(msg.received_at), "MMM dd, HH:mm") : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmsSearch;
