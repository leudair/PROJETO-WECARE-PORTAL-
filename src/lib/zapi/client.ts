import "server-only";

// Credenciais da instancia Z-API. Preencher apos criar a instancia
// (ver README para o passo a passo) — nao existem ainda, entao o envio
// real so funciona quando essas 3 variaveis forem configuradas.
function zapiConfig() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken) {
    throw new Error(
      "Z-API nao configurada: defina ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN."
    );
  }

  return { instanceId, token, clientToken };
}

export interface SendTextResult {
  zapiMessageId: string | null;
}

// Endpoint documentado pela Z-API para envio de texto simples.
// Confirmar o formato exato (nome dos campos de resposta) assim que a
// instancia estiver criada — a Z-API pode retornar "zaapId"/"messageId"/"id"
// dependendo da versao da conta.
export async function sendWhatsAppText(phone: string, message: string): Promise<SendTextResult> {
  const { instanceId, token, clientToken } = zapiConfig();

  const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    },
    body: JSON.stringify({
      phone: phone.replace(/^\+/, ""),
      message,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar mensagem via Z-API (${res.status}): ${text}`);
  }

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const zapiMessageId =
    (data?.messageId as string | undefined) ??
    (data?.zaapId as string | undefined) ??
    (data?.id as string | undefined) ??
    null;

  return { zapiMessageId };
}
