"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/app/components/PhoneInput";
import {
  useCreateB2bClient,
  useUpdateB2bClient,
  type B2bClient,
} from "@/lib/api/b2b";

type Props = {
  /** Omit to create a new client. */
  client?: Pick<B2bClient, "id" | "name" | "contact_name" | "contact_phone" | "contact_email" | "notes">;
  onClose: () => void;
  onSaved?: (client: { id: string; name: string }) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none";

export function ClientModal({ client, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    contact_name: client?.contact_name ?? "",
    contact_phone: client?.contact_phone ?? "",
    contact_email: client?.contact_email ?? "",
    notes: client?.notes ?? "",
  });
  const create = useCreateB2bClient();
  const update = useUpdateB2bClient();
  const saving = create.isPending || update.isPending;

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // A cleared field is sent as null so the edit sticks ("" would fail the
    // API's email check); on create it is simply left out.
    const optional = (v: string) => v.trim() || (client ? null : undefined);
    const body = {
      name: form.name.trim(),
      contact_name: optional(form.contact_name),
      contact_phone: optional(form.contact_phone),
      contact_email: optional(form.contact_email),
      notes: optional(form.notes),
    };
    try {
      const saved = client
        ? await update.mutateAsync({ id: client.id, ...body })
        : await create.mutateAsync(body);
      toast.success(client ? "Client updated." : `${saved.name} added.`);
      onSaved?.(saved);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save the client.", { duration: 6000 });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            {client ? "Edit client" : "New B2B client"}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Company name *</label>
            <input
              required
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contact person</label>
            <input
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contact phone</label>
            <PhoneInput value={form.contact_phone} onChange={(v) => set("contact_phone", v)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contact email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : client ? "Save changes" : "Add client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
