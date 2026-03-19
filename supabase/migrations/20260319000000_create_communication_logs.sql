-- Communication logs: tracks every SMS and voice OTP sent via LetsFish
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('sms', 'voice_otp')),
  recipient_phone text NOT NULL,
  message text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'delivered')),
  provider text NOT NULL DEFAULT 'letsfish',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX communication_logs_created_at_idx ON public.communication_logs (created_at DESC);
CREATE INDEX communication_logs_type_idx ON public.communication_logs (type);
CREATE INDEX communication_logs_status_idx ON public.communication_logs (status);

-- Allow service_role full access
GRANT ALL ON public.communication_logs TO service_role;

-- RLS
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to communication_logs"
  ON public.communication_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
