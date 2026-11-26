import "@fontsource-variable/instrument-sans/wght.css";
import "./crm-board.css";
import { listCrmBoard } from "@/lib/data/admin";
import CrmBoard from "./CrmBoard";

export default async function CrmPage() {
  const { columns } = await listCrmBoard();
  return <CrmBoard columns={columns} />;
}
