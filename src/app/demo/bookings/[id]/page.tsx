import { DemoBookingDetail } from "@/features/demo/booking-detail.client";
export default async function DemoBookingPage({ params }: { params: Promise<{ id: string }> }) {
  return <DemoBookingDetail id={(await params).id} />;
}
