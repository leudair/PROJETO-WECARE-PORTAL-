import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/data/auth";

export default async function RootPage() {
  const profile = await requireProfile();
  redirect(profile.role === "admin" || profile.role === "manager" ? "/admin" : "/dashboard");
}
