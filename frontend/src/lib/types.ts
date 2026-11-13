export type User = {
  id: string;
  business_id: string;
  email: string;
  full_name: string;
  role: string;
};

export type Business = {
  id: string;
  name: string;
  category: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  operating_hours: Record<string, { open?: string; close?: string; closed?: boolean }>;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_minor: number | null;
  is_active: boolean;
};

export type ReceptionistConfig = {
  business_id: string;
  receptionist_name: string | null;
  greeting: string | null;
  instructions: string;
  faqs: { question?: string; answer?: string }[];
  tone: string | null;
  handoff_enabled: boolean;
  handoff_destination: string | null;
};

export type CallRecord = {
  id: string;
  business_id: string;
  caller_number: string | null;
  caller_name: string | null;
  extension: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  transcript: string | null;
  summary: string | null;
  outcome: string | null;
};

export type Appointment = {
  id: string;
  business_id: string;
  service_id: string | null;
  call_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
  calendar_event_id: string | null;
  notes: string | null;
};

export type Integration = {
  id: string;
  business_id: string;
  provider: string;
  status: string;
  external_account: string | null;
  external_resource_id: string | null;
  last_checked_at: string | null;
  error_message: string | null;
};

export type SessionPayload = { user: User; business: Business };
