-- =========================================================
-- NETFLIX OTP SELF-SERVICE SYSTEM - DATABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor
-- =========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. NETFLIX MASTER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS netflix_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    imap_host TEXT DEFAULT 'imap.gmail.com',
    imap_port INTEGER DEFAULT 993,
    imap_user TEXT,
    imap_password TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CLIENT ACCESS KEYS TABLE
CREATE TABLE IF NOT EXISTS client_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES netflix_accounts(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    access_key TEXT UNIQUE NOT NULL, -- e.g. "NF-8492" or custom PIN
    valid_until TIMESTAMPTZ, -- Expiration date (null for lifetime)
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. OTP AND VERIFICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS otp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES netflix_accounts(id) ON DELETE CASCADE,
    otp_code TEXT, -- 4 or 6 digit OTP
    action_url TEXT, -- Netflix Household update or travel link
    email_subject TEXT,
    email_from TEXT,
    raw_snippet TEXT,
    received_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_used BOOLEAN DEFAULT false
);

-- Create Indexes for super fast real-time queries
CREATE INDEX IF NOT EXISTS idx_otp_logs_account_id ON otp_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_otp_logs_received_at ON otp_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_keys_access_key ON client_keys(access_key);
CREATE INDEX IF NOT EXISTS idx_client_keys_account_id ON client_keys(account_id);

-- Enable Supabase Realtime publication for real-time OTP push notifications
ALTER PUBLICATION supabase_realtime ADD TABLE otp_logs;

-- =========================================================
-- SECURE CLIENT RPC FUNCTION
-- Allows client portal to query OTP safely using only their Access Key
-- =========================================================
CREATE OR REPLACE FUNCTION get_client_live_otp(p_access_key TEXT)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    account_email TEXT,
    account_name TEXT,
    is_valid BOOLEAN,
    valid_until TIMESTAMPTZ,
    otp_id UUID,
    otp_code TEXT,
    action_url TEXT,
    email_subject TEXT,
    received_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client RECORD;
BEGIN
    -- Check if client exists and is active
    SELECT ck.id, ck.client_name, ck.account_id, ck.valid_until, ck.is_active,
           na.email as account_email, na.account_name
    INTO v_client
    FROM client_keys ck
    JOIN netflix_accounts na ON na.id = ck.account_id
    WHERE LOWER(TRIM(ck.access_key)) = LOWER(TRIM(p_access_key))
      AND ck.is_active = true
      AND (ck.valid_until IS NULL OR ck.valid_until > now());

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Return client info and latest 5 OTPs for this account
    RETURN QUERY
    SELECT 
        v_client.id AS client_id,
        v_client.client_name,
        v_client.account_email,
        v_client.account_name,
        true AS is_valid,
        v_client.valid_until,
        o.id AS otp_id,
        o.otp_code,
        o.action_url,
        o.email_subject,
        o.received_at
    FROM otp_logs o
    WHERE o.account_id = v_client.account_id
    ORDER BY o.received_at DESC
    LIMIT 5;

    -- If no OTP yet, still return client active status
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            v_client.id AS client_id,
            v_client.client_name,
            v_client.account_email,
            v_client.account_name,
            true AS is_valid,
            v_client.valid_until,
            NULL::UUID AS otp_id,
            NULL::TEXT AS otp_code,
            NULL::TEXT AS action_url,
            NULL::TEXT AS email_subject,
            NULL::TIMESTAMPTZ AS received_at;
    END IF;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE netflix_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to otp_logs for Realtime websocket (filtered by account or queried via RPC)
CREATE POLICY "Allow public select on otp_logs" ON otp_logs FOR SELECT USING (true);
CREATE POLICY "Allow full access for service role on otp_logs" ON otp_logs USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role on netflix_accounts" ON netflix_accounts USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role on client_keys" ON client_keys USING (true) WITH CHECK (true);
