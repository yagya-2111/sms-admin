import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Smartphone, MessageSquare, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sms-receiver`;

const ApiSetup = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const heartbeatExample = JSON.stringify({
    device_id: "my-unique-phone-id",
    device_name: "My Samsung S24",
    phone_number: "+1234567890",
    online_status: "online",
    power_level: 85,
    charger_status: false,
    screen_status: "on",
    sms_card_status: "normal"
  }, null, 2);

  const smsExample = JSON.stringify({
    device_id: "my-unique-phone-id",
    sender: "+9876543210",
    message_body: "Your OTP is 123456",
    received_at: new Date().toISOString()
  }, null, 2);

  const heartbeatUrl = `${BASE_URL}/heartbeat`;
  const smsUrl = `${BASE_URL}/forward-sms`;

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto font-mono text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedId === id ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              API Setup & Phone Integration
            </h1>
            <p className="text-xs text-muted-foreground">Connect your Android phone to forward SMS</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1 */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">1</div>
              <Smartphone className="w-4 h-4 text-primary" />
              Install SMS Forwarder App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Install <strong className="text-foreground">Tasker</strong> or <strong className="text-foreground">SMS Forwarder</strong> (by pnp00) from Google Play Store on your Android phone.
              These apps can detect incoming SMS and send them to our API automatically.
            </p>
            <p className="text-sm text-muted-foreground">
              Recommended free app: <strong className="text-foreground">Automate</strong> by LlamaLab or <strong className="text-foreground">Macrodroid</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Step 2: Heartbeat */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">2</div>
              <Zap className="w-4 h-4 text-primary" />
              Register Device (Heartbeat)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a POST request to register your phone. This also updates the device status (battery, online, etc). Send this every few minutes to keep the device "online".
            </p>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">ENDPOINT URL</p>
              <CodeBlock code={heartbeatUrl} id="heartbeat-url" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">JSON BODY (POST)</p>
              <CodeBlock code={heartbeatExample} id="heartbeat-body" />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Important:</strong> The <code className="bg-muted px-1 rounded text-foreground">device_id</code> must be unique per phone. Use something like your phone's IMEI or a custom string. This same ID is used when forwarding SMS.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Forward SMS */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">3</div>
              <MessageSquare className="w-4 h-4 text-primary" />
              Forward SMS Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              When an SMS is received on your phone, the forwarder app should send a POST request with the message details.
            </p>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">ENDPOINT URL</p>
              <CodeBlock code={smsUrl} id="sms-url" />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">JSON BODY (POST)</p>
              <CodeBlock code={smsExample} id="sms-body" />
            </div>
          </CardContent>
        </Card>

        {/* Step 4: cURL examples */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">4</div>
              Quick Test (cURL)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Test from your terminal to verify it works:</p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">REGISTER DEVICE</p>
              <CodeBlock
                code={`curl -X POST "${heartbeatUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ device_id: "my-phone", device_name: "My Phone", phone_number: "+1234567890", online_status: "online", power_level: 90 })}'`}
                id="curl-heartbeat"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">FORWARD AN SMS</p>
              <CodeBlock
                code={`curl -X POST "${smsUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ device_id: "my-phone", sender: "+9876543210", message_body: "Your OTP is 123456" })}'`}
                id="curl-sms"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiSetup;
