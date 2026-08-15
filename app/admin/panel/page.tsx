import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifySessionCookie } from "@/lib/admin-auth";
import PinGate from "@/components/admin/PinGate";
import PanelHome from "@/components/admin/PanelHome";

export default async function AdminPanelPage() {
  const cookieStore = await cookies();
  const authenticated = verifySessionCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return authenticated ? <PanelHome /> : <PinGate />;
}
