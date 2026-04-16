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

type BulkSmsResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ phone: string; error: string }>;
};

type PhoneCounts = { total: number; sms_opted_in: number };

type RecipientPreview = { name: string; phone: string; preview: string };
type RecipientPreviewData = {
  data: RecipientPreview[];
  total: number;
  page: number;
  totalPages: number;
};

function getSmsSegments(msg: string) {
  const isUnicode = /[^\x00-\x7F]/.test(msg);
  const limit = isUnicode ? 70 : 160;
  const segSize = isUnicode ? 67 : 153;
  const len = msg.length;
  if (len === 0) return { segments: 0, charsLeft: limit };
  const segments = len <= limit ? 1 : Math.ceil(len / segSize);
  const charsLeft =
    len <= limit ? limit - len : segSize - (len - (segments - 1) * segSize);
  return { segments, charsLeft };
}

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

  // Bulk SMS state
  const [phoneCounts, setPhoneCounts] = useState<PhoneCounts | null>(null);
  const [bulkFilter, setBulkFilter] = useState<"all" | "sms_opted_in">("all");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkSmsResult | null>(null);

  // Review modal state
  const [showReview, setShowReview] = useState(false);
  const [previewData, setPreviewData] = useState<RecipientPreviewData | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);

  useEffect(() => {
    apiClient<StatusData>("/communications/status")
      .then(setStatus)
      .catch(() => setStatus(null));
    apiClient<PhoneCounts>("/communications/phone-counts")
      .then(setPhoneCounts)
      .catch(() => setPhoneCounts({ total: 0, sms_opted_in: 0 }));
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

  async function fetchPreviewPage(page: number) {
    setPreviewLoading(true);
    try {
      const data = await apiClient<RecipientPreviewData>("/communications/recipient-preview", {
        method: "POST",
        body: { message: bulkMessage, recipient_filter: bulkFilter, page, limit: 20 },
      });
      setPreviewData(data);
      setPreviewPage(page);
    } catch {
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleOpenReview() {
    setShowReview(true);
    setPreviewPage(1);
    setConfirmingSend(false);
    await fetchPreviewPage(1);
  }

  async function handleBulkSend() {
    setBulkSending(true);
    setBulkResult(null);
    try {
      const res = await apiClient<BulkSmsResult>("/communications/bulk-sms", {
        method: "POST",
        body: { message: bulkMessage, recipient_filter: bulkFilter },
      });
      setBulkResult(res);
      setShowReview(false);
      setConfirmingSend(false);
      apiClient<LogsData>("/communications/logs?page=1&limit=20").then((d) => {
        setLogs(d);
        setLogsPage(1);
      });
    } catch (err: any) {
      setBulkResult({ total: 0, succeeded: 0, failed: 0, errors: [{ phone: "", error: err.message }] });
      setShowReview(false);
      setConfirmingSend(false);
    } finally {
      setBulkSending(false);
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

      {/* Bulk SMS */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" /> Bulk SMS
        </h2>

        {/* Recipient filter */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Recipients</p>
          <div className="flex flex-col gap-2">
            {(
              [
                { value: "all", label: "All customers with phone numbers", count: phoneCounts?.total },
                { value: "sms_opted_in", label: "SMS opted-in only", count: phoneCounts?.sms_opted_in },
              ] as const
            ).map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="bulkFilter"
                  value={opt.value}
                  checked={bulkFilter === opt.value}
                  onChange={() => setBulkFilter(opt.value)}
                  className="accent-slate-900"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="ml-auto text-xs text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">
                    {opt.count} recipient{opt.count !== 1 ? "s" : ""}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Message composer */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Message</label>
            <span className="text-xs text-slate-400">
              {(() => {
                const { segments, charsLeft } = getSmsSegments(bulkMessage);
                return segments === 0
                  ? "0 chars"
                  : `${bulkMessage.length} chars · ${segments} SMS segment${segments !== 1 ? "s" : ""} · ${charsLeft} left in segment`;
              })()}
            </span>
          </div>
          <textarea
            value={bulkMessage}
            onChange={(e) => setBulkMessage(e.target.value)}
            rows={4}
            placeholder="Hi [name], thanks for shopping with us..."
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
          />
          <p className="text-xs text-slate-400">
            Use <code className="font-mono bg-slate-100 px-1 rounded">[name]</code> to insert each customer&apos;s first name. Falls back to &ldquo;there&rdquo; if no name is saved.
          </p>
        </div>

        {/* Message preview */}
        {bulkMessage && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Preview</p>
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap max-w-xs">
              {bulkMessage}
            </div>
            <p className="text-xs text-slate-400">Sender ID: 1NRI</p>
          </div>
        )}

        <button
          disabled={!bulkMessage.trim() || !status?.configured}
          onClick={handleOpenReview}
          className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          Review &amp; Send to{" "}
          {bulkFilter === "all"
            ? phoneCounts?.total ?? "..."
            : phoneCounts?.sms_opted_in ?? "..."}{" "}
          recipients
        </button>

        {bulkResult && (
          <div
            className={`rounded px-3 py-2 text-sm ${
              bulkResult.failed > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            Sent {bulkResult.succeeded} / {bulkResult.total} — {bulkResult.failed} failed.
            {bulkResult.errors.length > 0 && bulkResult.errors[0].phone && (
              <details className="mt-1">
                <summary className="text-xs cursor-pointer">Show errors</summary>
                <ul className="mt-1 text-xs space-y-0.5">
                  {bulkResult.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      {e.phone}: {e.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Review & Send Modal */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Review Recipients</h2>
                {previewData && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {previewData.total} recipient{previewData.total !== 1 ? "s" : ""} · page {previewPage} of {previewData.totalPages}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowReview(false); setConfirmingSend(false); }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Recipient table */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : !previewData || previewData.data.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No recipients found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Phone</th>
                      <th className="pb-2 font-medium">Message preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {previewData.data.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-4 text-slate-700 whitespace-nowrap">{r.name}</td>
                        <td className="py-2.5 pr-4 text-slate-400 text-xs whitespace-nowrap">{r.phone}</td>
                        <td className="py-2.5 text-slate-600 text-xs">{r.preview}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {previewData && previewData.totalPages > 1 && (
              <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => fetchPreviewPage(previewPage - 1)}
                  disabled={previewPage === 1 || previewLoading}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {previewPage} of {previewData.totalPages}
                </span>
                <button
                  onClick={() => fetchPreviewPage(previewPage + 1)}
                  disabled={previewPage === previewData.totalPages || previewLoading}
                  className="rounded border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}

            {/* Footer — confirm step */}
            <div className="border-t border-slate-100 px-6 py-4 shrink-0 space-y-3">
              {!confirmingSend ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReview(false); setConfirmingSend(false); }}
                    className="flex-1 rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setConfirmingSend(true)}
                    disabled={previewLoading || !previewData || previewData.total === 0}
                    className="flex-1 flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Looks good — Send to {previewData?.total ?? "..."} recipients
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                    This will send <strong>{previewData?.total}</strong> personalised messages. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingSend(false)}
                      disabled={bulkSending}
                      className="flex-1 rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkSend}
                      disabled={bulkSending}
                      className="flex-1 flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {bulkSending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      {bulkSending ? "Sending..." : "Confirm & Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
