import { DEFAULT_LEAD_INTEREST_VALUE, listOwnContacts } from "@/lib/data/contacts";
import { ContactForm } from "./contact-form";
import { ConvertLeadButton } from "./convert-button";
import { PurchaseValue } from "./purchase-value";
import { Podium } from "./podium";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function DashboardPage() {
  const contacts = await listOwnContacts();

  return (
    <div className="space-y-8">
      <ContactForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Meus lembretes</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Telefone</th>
                <th className="px-4 py-2">Última compra</th>
                <th className="px-4 py-2">Contato em</th>
                <th className="px-4 py-2">Lead</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Nenhum lembrete cadastrado ainda.
                  </td>
                </tr>
              )}
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    {contact.name}
                    {contact.instagram_handle && (
                      <span className="ml-1 text-muted">@{contact.instagram_handle}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {contact.contact_type === "cliente" ? "Cliente" : `Lead · ${contact.attempt_stage}ª tentativa`}
                  </td>
                  <td className="px-4 py-2 text-muted">{contact.phone}</td>
                  <td className="px-4 py-2">
                    {contact.contact_type === "cliente" || contact.converted ? (
                      <PurchaseValue contactId={contact.id} value={contact.last_purchase_value} />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted">{formatDate(contact.next_contact_date)}</td>
                  <td className="px-4 py-2">
                    {contact.contact_type !== "lead" ? (
                      "—"
                    ) : contact.converted ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Convertido ✓
                      </span>
                    ) : (
                      <ConvertLeadButton
                        contactId={contact.id}
                        suggestedValue={contact.lead_interest_value ?? DEFAULT_LEAD_INTEREST_VALUE}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Podium />
    </div>
  );
}
