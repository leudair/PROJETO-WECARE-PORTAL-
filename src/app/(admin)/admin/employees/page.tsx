import { listEmployees } from "@/lib/data/admin";
import { getCurrentProfile } from "@/lib/data/auth";
import { EmployeeForm } from "./employee-form";
import { NoticeForm } from "./notice-form";
import { DeleteEmployeeButton } from "./delete-button";
import { EditEmployeeButton } from "./edit-button";

const ROLE_LABEL: Record<string, string> = {
  employee: "Funcionário",
  manager: "Gerente",
  financeiro: "Financeiro",
};

export default async function EmployeesPage() {
  const [employees, profile] = await Promise.all([listEmployees(), getCurrentProfile()]);

  return (
    <div className="space-y-8">
      <EmployeeForm canCreateManager={profile?.role === "admin"} />

      <div>
        <h2 className="mb-3 text-base font-bold text-foreground">Funcionários, gerentes e financeiro</h2>
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">WhatsApp</th>
                  <th className="px-5 py-3">Exportar</th>
                  <th className="px-5 py-3">Aviso</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted">
                      Nenhum funcionário cadastrado ainda.
                    </td>
                  </tr>
                )}
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-border hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="icon-orb h-8 w-8 shrink-0 text-xs font-bold text-white">
                          {employee.full_name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("")}
                        </span>
                        <span className="font-medium text-foreground">{employee.full_name}</span>
                        <EditEmployeeButton
                          employeeId={employee.id}
                          fullName={employee.full_name}
                          email={employee.email}
                          whatsappNumber={employee.whatsapp_number}
                          role={employee.role}
                          canSetElevatedRole={profile?.role === "admin"}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{ROLE_LABEL[employee.role] ?? employee.role}</td>
                    <td className="px-5 py-3 text-muted">{employee.whatsapp_number}</td>
                    <td className="px-5 py-3">
                      {employee.role === "employee" ? (
                        <>
                          <a
                            href={`/api/admin/export?employeeId=${employee.id}&format=csv`}
                            className="mr-3 text-primary underline hover:text-foreground"
                          >
                            CSV
                          </a>
                          <a
                            href={`/api/admin/export?employeeId=${employee.id}&format=txt`}
                            className="text-primary underline hover:text-foreground"
                          >
                            TXT
                          </a>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <NoticeForm employeeId={employee.id} />
                    </td>
                    <td className="px-5 py-3">
                      <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.full_name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
