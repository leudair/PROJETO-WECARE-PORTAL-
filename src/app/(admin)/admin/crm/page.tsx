import "@fontsource-variable/outfit/wght.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "./crm-board.css";
import { listCrmBoard } from "@/lib/data/admin";
import CrmBoard from "./CrmBoard";

export default async function CrmPage() {
  const { columns, stats } = await listCrmBoard();
  return <CrmBoard columns={columns} stats={stats} />;
}
