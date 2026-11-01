export function appointmentStatus(status: string) {
  return status === "pending_worker" ? "awaiting worker confirmation" : status.replaceAll("_", " ");
}
