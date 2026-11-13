"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { BusinessSettingsForm } from "@/components/business-settings-form";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useResource } from "@/lib/use-resource";
import type { Business, Service } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter(); const business = useResource<Business>("business"); const services = useResource<Service[]>("services");
  const loading = business.loading || services.loading; const error = business.error || services.error;
  return <><PageHeader title="Set up your business" subtitle="Add the details your receptionist needs to represent you accurately." />
    <div className="setup-progress"><div className="setup-progress-step"><span className="step-icon step-done"><Check size={13} /></span><div><strong>Workspace created</strong><small>Your private business workspace is ready.</small></div></div><ArrowRight size={15} /><div className="setup-progress-step"><span className="step-icon">2</span><div><strong>Business details</strong><small>Profile, hours, and services.</small></div></div><ArrowRight size={15} /><div className="setup-progress-step setup-step-muted"><span className="step-icon">3</span><div><strong>Receptionist</strong><small>Greeting and instructions.</small></div></div></div>
    {loading ? <Card><LoadingState label="Preparing your business setup" /></Card> : error || !business.data ? <ErrorState message={error || "Business setup could not load."} retry={() => { business.reload(); services.reload(); }} /> : <Card className="onboarding-card"><BusinessSettingsForm business={business.data} services={services.data ?? []} onboarding onSaved={() => { router.replace("/receptionist"); router.refresh(); }} /></Card>}
  </>;
}
