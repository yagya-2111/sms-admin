import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, User, Download, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";

const AMOUNT_THRESHOLD = 0;

type TxnType = "credit" | "debit" | null;

interface ParsedTxn {
  type: TxnType;
  amount: number;
}

// Parse SMS body: count as a transaction ONLY when the amount is directly
// prefixed by an Rs / Rs. / INR / ₹ token (e.g. "Rs 14,500", "Rs.20000", "INR 500", "₹1,200").
// Messages that mention numbers without an Rs-style prefix are ignored.
const parseTxn = (body: string | null | undefined): ParsedTxn => {
  if (!body) return { type: null, amount: 0 };
  const text = body.toLowerCase();

  let type: TxnType = null;
  if (/\b(credited|credit|received|deposited|added)\b/.test(text)) type = "credit";
  else if (/\b(debited|debit|withdrawn|paid|spent|purchase|sent)\b/.test(text)) type = "debit";

  const amountRegex = /(?:rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/gi;
  let maxAmount = 0;
  let m: RegExpExecArray | null;
  while ((m = amountRegex.exec(text)) !== null) {
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(num) && num > maxAmount) maxAmount = num;
  }

  if (maxAmount === 0) return { type: null, amount: 0 };
  return { type, amount: maxAmount };
};

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const DeviceSms = () => {
  const { deviceId } = useParams<{ deviceId: string }>();

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ["device-resolve", deviceId],
    queryFn: async () => {
      if (!deviceId) return null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId);
      const query = supabase.from("devices").select("*");
      const { data, error } = isUuid
        ? await query.eq("id", deviceId).maybeSingle()
        : await query.eq("device_id", deviceId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["sms", device?.id],
    enabled: !!device?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("device_id", device!.id)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const enriched = useMemo(
    () => (messages ?? []).map((m) => ({ ...m, txn: parseTxn(m.message_body) })),
    [messages]
  );

  const highValue = useMemo(
    () => enriched.filter((m) => m.txn.type !== null && m.txn.amount > 0),
    [enriched]
  );

  const generatePdf = () => {
    if (highValue.length === 0) {
      toast.error("No credit/debit messages found");
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 40;
    let y = 50;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Credit / Debit Transactions Report", marginX, y);
    y += 22;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Device: ${device?.device_name ?? "Unknown"} (${device?.device_id ?? ""})`, marginX, y);
    y += 14;
    doc.text(`Phone: ${device?.phone_number ?? "-"}`, marginX, y);
    y += 14;
    doc.text(`Records: ${highValue.length}`, marginX, y);
    y += 14;
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, marginX, y);
    y += 20;

    doc.setDrawColor(200);
    doc.line(marginX, y, pageW - marginX, y);
    y += 16;

    highValue.forEach((m, idx) => {
      const bodyLines = doc.splitTextToSize(m.message_body ?? "", pageW - marginX * 2);
      const blockH = 60 + bodyLines.length * 12;
      if (y + blockH > pageH - 40) {
        doc.addPage();
        y = 50;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const typeLabel = m.txn.type === "credit" ? "CREDIT" : "DEBIT";
      doc.text(`${idx + 1}. ${typeLabel}  ${formatInr(m.txn.amount)}`, marginX, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(`From: ${m.sender || "Unknown"}`, marginX, y);
      doc.text(
        m.received_at ? format(new Date(m.received_at), "yyyy-MM-dd HH:mm:ss") : "",
        pageW - marginX,
        y,
        { align: "right" }
      );
      y += 14;

      doc.setTextColor(30);
      doc.setFontSize(10);
      doc.text(bodyLines, marginX, y);
      y += bodyLines.length * 12 + 10;

      doc.setDrawColor(230);
      doc.line(marginX, y, pageW - marginX, y);
      y += 12;
    });

    const filename = `transactions-${device?.device_id ?? "device"}-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`;
    doc.save(filename);
    toast.success(`Downloaded ${highValue.length} records`);
  };

  const totals = useMemo(() => {
    const credit = highValue.filter((m) => m.txn.type === "credit").reduce((s, m) => s + m.txn.amount, 0);
    const debit = highValue.filter((m) => m.txn.type === "debit").reduce((s, m) => s + m.txn.amount, 0);
    return { credit, debit };
  }, [highValue]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {device?.device_name ?? "Device"} — SMS Inbox
            </h1>
            <p className="text-xs text-muted-foreground font-mono truncate" style={{ fontFamily: 'var(--font-mono)' }}>
              {device?.device_id} · {device?.phone_number}
            </p>
          </div>
          <Button size="sm" onClick={generatePdf} disabled={highValue.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            PDF ({highValue.length})
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {device && highValue.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Credit / Debit transactions</p>
                <p className="text-sm font-medium">
                  {highValue.length} messages ·{" "}
                  <span className="text-green-600">+{formatInr(totals.credit)}</span> /{" "}
                  <span className="text-destructive">-{formatInr(totals.debit)}</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={generatePdf}>
                <Download className="w-4 h-4 mr-1.5" /> Download PDF
              </Button>
            </CardContent>
          </Card>
        )}

        {deviceLoading ? (
          <p className="text-center py-20 text-muted-foreground">Loading device...</p>
        ) : !device ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-medium">Device not found</p>
              <p className="text-xs text-muted-foreground mt-1">No device matches this ID. It may have been removed.</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <p className="text-center py-20 text-muted-foreground">Loading messages...</p>
        ) : !enriched.length ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No SMS messages received yet</p>
              <p className="text-xs text-muted-foreground mt-1">Messages will appear here when the device forwards them</p>
            </CardContent>
          </Card>
        ) : (
          enriched.map((msg) => {
            const isTxn = msg.txn.type !== null && msg.txn.amount > 0;
            return (
              <Card key={msg.id} className={`border ${isTxn ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{msg.sender || "Unknown"}</span>
                          {msg.txn.type === "credit" && msg.txn.amount > 0 && (
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/40">
                              <ArrowDownCircle className="w-3 h-3 mr-1" />
                              Credit {formatInr(msg.txn.amount)}
                            </Badge>
                          )}
                          {msg.txn.type === "debit" && msg.txn.amount > 0 && (
                            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                              <ArrowUpCircle className="w-3 h-3 mr-1" />
                              Debit {formatInr(msg.txn.amount)}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {msg.received_at ? format(new Date(msg.received_at), "yyyy-MM-dd HH:mm:ss") : ""}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{msg.message_body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeviceSms;
