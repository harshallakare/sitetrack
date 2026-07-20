import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { getServerT } from "@/lib/i18n/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateServiceDialog } from "./create-service-dialog";
import { EditServiceDialog } from "./edit-service-dialog";
import { CopyServiceButton } from "./copy-service-button";

interface Service {
  id: string;
  name: string;
  unitOfMeasure: string;
  category: string | null;
  standardRateMinor: number | null;
  description: string | null;
}

export default async function ServicesPage() {
  const t = getServerT();
  const services = await serverFetch<Service[]>("/services");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("services.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("services.subtitle")}</p>
        </div>
        <CreateServiceDialog />
      </div>

      {services.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {t("services.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{service.name}</div>
                <div className="flex items-center gap-0.5">
                  <EditServiceDialog service={service} />
                  <CopyServiceButton service={service} />
                  <DeleteButton path={`/services/${service.id}`} confirmMessage={t("services.deleteConfirm")} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {service.unitOfMeasure.replace("_", " ")} {service.category ? `· ${service.category}` : ""}
              </div>
              {service.standardRateMinor != null && (
                <div className="mt-3 text-sm">
                  <div className="text-muted-foreground">{t("services.standardRate")}</div>
                  <div className="font-semibold text-primary">
                    ₹{fromMinorUnits(service.standardRateMinor).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
