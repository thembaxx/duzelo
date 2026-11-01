import { redirect } from "next/navigation";
export default function WorkerServices() {
  redirect("/app/worker/onboarding?edit=1");
}
