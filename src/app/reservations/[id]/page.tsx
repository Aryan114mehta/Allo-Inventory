import { notFound } from "next/navigation";
import { getReservationById } from "@/services/reservation";
import { ReservationDetails } from "@/components/modules/reservation/ReservationDetails";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Reservation ${id.slice(0, 8)}… — Allo Inventory`,
  };
}

export default async function ReservationPage({ params }: Props) {
  const { id } = await params;

  let reservation;
  try {
    reservation = await getReservationById(id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Checkout
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your purchase before the hold expires.
        </p>
      </div>
      <ReservationDetails reservation={reservation} />
    </main>
  );
}
