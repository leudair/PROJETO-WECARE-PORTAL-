// Cada funcionária representa um "W" dentro do cadastro (ex: "W2 - Claúdia
// Beranger") — o nome é rotativo, mas o W é fixo, então os links por
// funcionária (site institucional, IA) são montados a partir dele, nunca do nome.
const WECAREMIDIAS_BASE = "https://www.wecaremidias.com.br";
const IAWECARE_BASE = "https://iawecare.com.br";

export function getEmployeeWCode(fullName: string): string | null {
  const match = fullName.match(/^W(\d+)\b/i);
  return match ? `w${match[1]}` : null;
}

export function getEmployeeSiteUrl(fullName: string): string | null {
  const code = getEmployeeWCode(fullName);
  return code ? `${WECAREMIDIAS_BASE}/${code}` : null;
}

export function getEmployeeAiUrl(fullName: string): string | null {
  const code = getEmployeeWCode(fullName);
  return code ? `${IAWECARE_BASE}/${code}` : null;
}
