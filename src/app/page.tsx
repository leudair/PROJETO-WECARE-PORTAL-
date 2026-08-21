import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data/auth";

export default async function RootPage() {
  const profile = await requireProfile();

  if (profile.role === "admin" || profile.role === "manager") {
    redirect("/admin");
  }
  if (profile.role === "financeiro") {
    redirect("/financeiro");
  }
  redirect("/dashboard");
}
