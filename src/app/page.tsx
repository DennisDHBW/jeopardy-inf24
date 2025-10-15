import { getServerSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function Home() {
  // Server component, so we simply use the server side auth session info.
  // Based on auth state, we redirect differently.
  if (await getServerSession()) {
    redirect("/home");
  } else {
    redirect("/login");
  }
}
