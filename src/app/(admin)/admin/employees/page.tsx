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
        <h2 className="mb-3 text-sm font-semibold text-foreground">Funcionários, gerentes e financeiro</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Papel</th>
                <th className="px-4 py-2">WhatsApp</th>
                <th className="px-4 py-2">Exportar</th>
                <th className="px-4 py-2">Aviso</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Nenhum funcionário cadastrado ainda.
                  </td>
                </tr>
              )}
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {employee.full_name}
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
                  <td className="px-4 py-2 text-muted">{ROLE_LABEL[employee.role] ?? employee.role}</td>
                  <td className="px-4 py-2 text-muted">{employee.whatsapp_number}</td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2">
                    <NoticeForm employeeId={employee.id} />
                  </td>
                  <td className="px-4 py-2">
                    <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.full_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
