import { adminServerFetch } from "@/lib/admin-server-api";
import type { PaymentProviderDescriptor } from "@sitetrack/shared-types";
import { PaymentGatewaysManager, type GatewayConfig } from "./payment-gateways-manager";

export default async function AdminPaymentGatewaysPage() {
  const [registry, configs] = await Promise.all([
    adminServerFetch<PaymentProviderDescriptor[]>("/admin/payment-gateways/registry"),
    adminServerFetch<GatewayConfig[]>("/admin/payment-gateways"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateways</h1>
        <p className="text-sm text-muted-foreground">
          Configure the gateway used to bill customer organizations. Add your keys and activate one — secrets are
          stored encrypted and never shown again.
        </p>
      </div>
      <PaymentGatewaysManager registry={registry} configs={configs} />
    </div>
  );
}
