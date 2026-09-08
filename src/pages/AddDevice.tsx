import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AddDevice = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    device_name: "",
    device_id: "",
    phone_number: "",
    remark: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("devices").insert({
        device_name: form.device_name,
        device_id: form.device_id,
        phone_number: form.phone_number || null,
        remark: form.remark || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device added successfully");
      navigate("/");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Device ID already exists");
      } else {
        toast.error("Failed to add device");
      }
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Add New Device</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Device Details</CardTitle>
                <CardDescription>Enter the device information to register it</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device_name">Device Name *</Label>
              <Input id="device_name" placeholder="e.g. My Android Phone" value={form.device_name} onChange={(e) => setForm(f => ({ ...f, device_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_id">Unique Device ID *</Label>
              <Input id="device_id" placeholder="e.g. I2404" value={form.device_id} onChange={(e) => setForm(f => ({ ...f, device_id: e.target.value }))} style={{ fontFamily: 'var(--font-mono)' }} />
              <p className="text-xs text-muted-foreground">This ID must be unique across all devices</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" placeholder="e.g. 8015145311" value={form.phone_number} onChange={(e) => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">Remark</Label>
              <Input id="remark" placeholder="Optional note" value={form.remark} onChange={(e) => setForm(f => ({ ...f, remark: e.target.value }))} />
            </div>
            <Button className="w-full" disabled={!form.device_name || !form.device_id || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Adding..." : "Add Device"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddDevice;
