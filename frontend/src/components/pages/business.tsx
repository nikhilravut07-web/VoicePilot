"use client";
import { useResource } from "@/lib/use-resource";
import type { Business, Service } from "@/lib/types";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { BusinessSettingsForm } from "@/components/business-settings-form";
import { ServiceManager } from "@/components/service-manager";

export default function BusinessPage() {
  const business = useResource<Business>("business"); const services = useResource<Service[]>("services");
  const loading = business.loading || services.loading; const error = business.error || services.error;
  const reload = () => { business.reload(); services.reload(); };
  return <><PageHeader title="Business profile" subtitle="Keep the details and service list for your receptionist up to date." />{loading ? <Card><LoadingState label="Loading business profile" /></Card> : error || !business.data ? <ErrorState message={error || "Business profile unavailable."} retry={reload} /> : <div className="profile-stack"><Card><BusinessSettingsForm business={business.data} services={services.data ?? []} onSaved={reload} /></Card><Card><div className="card-heading"><div><h2>Services</h2><p>Business services and appointment lengths.</p></div></div><ServiceManager services={services.data ?? []} onSaved={reload} /></Card></div>}</>;
}
