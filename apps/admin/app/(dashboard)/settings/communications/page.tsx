"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Send, PhoneCall, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api/client";

type StatusData = {
  configured: boolean;
  baseUrl: string;
  provider: string;
};

type LogEntry = {
  id: string;
  type: "sms" | "voice_otp";
  recipient_phone: string;
  message: string | null;
  status: "sent" | "failed" | "delivered";
  provider: string;
  metadata: Record<string, string> | null;
  created_at: string;
};

type LogsData = {
  data: LogEntry[];
  total: number;
  page: number;
  totalPages: number;
};

export default function CommunicationsSettingsPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);

  // Test SMS form state
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("Test message from Iris admin panel.");
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  // Test call form state
  const [callPhone, setCallPhone] = useState("");
  const [callOtp, setCallOtp] = useState("1234");
  const [callSending, setCallSending] = useState(false);
  const [callResult, setCallResult] = useState<string | null>(null);

  useEffect(() => {
    apiClient<StatusData>("/communications/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    setLogsLoading(true);
    apiClient<LogsData>(`/communications/logs?page=${logsPage}&limit=20`)
      .then(setLogs)
      .catch(() => setLogs(null))
      .finally(() => setLogsLoading(false));
  }, [logsPage]);

  async function handleTestSms(e: React.FormEvent) {
    e.preventDefault();
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await apiClient<{ success: boolean }>("/communications/test-sms", {
        method: "POST",
        body: { phone: smsPhone, message: smsMessage },
      });
      setSmsResult(res.success ? "SMS sent successfully." : "SMS failed.");
    } catch (err: any) {
      setSmsResult(`Error: ${err.message}`);
    } finally {
      setSmsSending(false);
      // Refresh logs
      apiClient<LogsData>(`/communications/logs?page=1&limit=20`).then((d) => {
        setLogs(d);
        setLogsPage(1);
      });
    }
  }

  async function handleTestCall(e: React.FormEvent) {
    e.preventDefault();
    setCallSending(true);
    setCallResult(null);
    try {
      const res = await apiClient<{ success: boolean }>("/communications/test-call", {
        method: "POST",
        body: { phone: callPhone, otp: callOtp },
      });
      setCallResult(res.success ? "Voice OTP call initiated." : "Call failed.");
    } catch (err: any) {
      setCallResult(`Error: ${err.message}`);
    } finally {
      setCallSending(false);
      apiClient<LogsData>(`/communications/logs?page=1&limit=20`).then((d) => {
        setLogs(d);
        setLogsPage(1);
      });
    }
  }

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Communications</h1>
        <p className="text-sm text-slate-500">
          Manage LetsFish SMS and voice OTP settings.
        </p>
      </header>

      {/* Service Status */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-base font-semibold">Service Status</h2>
        {status === null ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="flex items-center gap-3">
            {status.configured ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {status.configured ? "LetsFish connected" : "Not configured"}
              </p>
              <p className="text-xs text-slate-400">{status.baseUrl}</p>
            </div>
          </div>
        )}
        {status && !status.configured && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
            Set <code className="font-mono">LETSFISH_APP_ID</code> and{" "}
            <code className="font-mono">LETSFISH_APP_SECRET</code> in{" "}
            <code className="font-mono">apps/backend/.env</code> to activate.
          </p>
        )}
      </div>

      {/* SMS Templates */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-base font-semibold">SMS Templates</h2>
        <p className="text-xs text-slate-400">
          These templates are used automatically for system notifications.
        </p>
        <div className="divide-y divide-slate-100 text-sm">
          {[
            { name: "Order Confirmation", preview: "Order #[number] confirmed! We'll update you on shipping soon." },
          ].map((t) => (
            <div key={t.name} className="py-3">
              <p className="font-medium text-slate-700">{t.name}</p>
              <p className="text-slate-400 mt-0.5">{t.preview}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Test Sends */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Test SMS */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Send className="h-4 w-4" /> Send Test SMS
          </h2>
          <form onSubmit={handleTestSms} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+233241234567"
                required
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Message
              </label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={3}
                required
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={smsSending}
              className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {smsSending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Send SMS
            </button>
            {smsResult && (
              <p className={`text-xs ${smsResult.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                {smsResult}
              </p>
            )}
          </form>
        </div>

        {/* Test Voice OTP */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <PhoneCall className="h-4 w-4" /> Test Voice OTP Call
          </h2>
          <form onSubmit={handleTestCall} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={callPhone}
                onChange={(e) => setCallPhone(e.target.value)}
                placeholder="+233241234567"
                required
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                OTP Code (4–6 digits)
              </label>
              <input
                type="text"
                value={callOtp}
                onChange={(e) => setCallOtp(e.target.value)}
                placeholder="1234"
                maxLength={6}
                required
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={callSending}
              className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {callSending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Make Call
            </button>
            {callResult && (
              <p className={`text-xs ${callResult.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
                {callResult}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Communication Logs */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">Communication Logs</h2>
        {logsLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !logs || logs.data.length === 0 ? (
          <p className="text-sm text-slate-400">No messages sent yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Recipient</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.data.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.type === "sms"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-violet-50 text-violet-700"
                        }`}>
                          {log.type === "sms" ? "SMS" : "Voice OTP"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{log.recipient_phone}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status === "sent" || log.status === "delivered"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400 text-xs">{log.provider}</td>
                      <td className="py-2.5 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.totalPages > 1 && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {logsPage} of {logs.totalPages}
                </span>
                <button
                  onClick={() => setLogsPage((p) => Math.min(logs.totalPages, p + 1))}
                  disabled={logsPage === logs.totalPages}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
