import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { DeleteButton } from "@/components/ui/delete-button";
import { getServerT } from "@/lib/i18n/server";
import { CreateBookingDialog } from "./create-booking-dialog";
import { UpdateBookingDialog } from "./update-booking-dialog";

interface ServiceBooking {
  id: string;
  bookingDate: string;
  quantity: number;
  rateMinor: number;
  totalMinor: number;
  status: string;
  progressPercent: number;
  notes: string | null;
  service: { name: string; unitOfMeasure: string };
  site: { name: string };
  vendor: { contactPerson: string; companyName: string | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
  COMPLETED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

export default async function ServiceBookingsPage() {
  const t = getServerT();
  const [bookings, sites, services, vendors] = await Promise.all([
    serverFetch<ServiceBooking[]>("/service-bookings"),
    serverFetch<Array<{ id: string; name: string }>>("/sites"),
    serverFetch<Array<{ id: string; name: string; unitOfMeasure: string }>>("/services"),
    serverFetch<Array<{ id: string; contactPerson: string; companyName: string | null }>>("/vendors"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("bookings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("bookings.subtitle")}</p>
        </div>
        <CreateBookingDialog
          sites={sites.map((s) => ({ id: s.id, label: s.name }))}
          services={services.map((s) => ({ id: s.id, label: `${s.name} (${s.unitOfMeasure.replace("_", " ")})` }))}
          vendors={vendors.map((v) => ({ id: v.id, label: v.companyName ?? v.contactPerson }))}
        />
      </div>

      {bookings.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {t("bookings.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{booking.service.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {booking.site.name} · {new Date(booking.bookingDate).toLocaleDateString()}
                    {booking.vendor ? ` · ${booking.vendor.companyName ?? booking.vendor.contactPerson}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-semibold text-primary">₹{fromMinorUnits(booking.totalMinor).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {booking.quantity} {booking.service.unitOfMeasure.replace("_", " ")}
                    </div>
                  </div>
                  <UpdateBookingDialog booking={booking} />
                  <DeleteButton path={`/service-bookings/${booking.id}`} confirmMessage={t("bookings.deleteConfirm")} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[booking.status] ?? "bg-muted"}`}>
                  {booking.status.replace("_", " ")}
                </span>
                <span className="text-muted-foreground">{booking.progressPercent}% {t("bookings.complete")}</span>
                {booking.notes && <span className="text-muted-foreground">· {booking.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
