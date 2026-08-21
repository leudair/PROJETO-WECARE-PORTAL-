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

        {contacts.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Nenhum lembrete cadastrado ainda.
          </div>
        )}

        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
                <h3 className="font-semibold text-foreground">
                  {contact.name}
                  {contact.instagram_handle && (
                    <span className="ml-1 font-normal text-muted">@{contact.instagram_handle}</span>
                  )}
                </h3>
                <span className="text-xs text-muted">
                  {contact.contact_type === "cliente" ? "Cliente" : `Lead · ${contact.attempt_stage}ª tentativa`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-2">
                  <p className="text-[10px] uppercase text-muted">Telefone</p>
                  <p className="font-medium text-foreground">{contact.phone}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2">
                  <p className="text-[10px] uppercase text-muted">Contato em</p>
                  <p className="font-medium text-foreground">{formatDate(contact.next_contact_date)}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2">
                  <p className="text-[10px] uppercase text-muted">Última compra</p>
                  {contact.contact_type === "cliente" || contact.converted ? (
                    <PurchaseValue contactId={contact.id} value={contact.last_purchase_value} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
              </div>

              {contact.contact_type === "lead" && (
                <div className="mt-3">
                  {contact.converted ? (
                    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Convertido ✓
                    </span>
                  ) : (
                    <ConvertLeadButton
                      contactId={contact.id}
                      suggestedValue={contact.lead_interest_value ?? DEFAULT_LEAD_INTEREST_VALUE}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Podium />
    </div>
  );
}
