// Team login IDs such as ahmed@qat123. Behind the scenes each one is a private address that receives no mail.
const ISO3: Record<string, string> = {
  QA: "qat", AE: "are", SA: "sau", KW: "kwt", BH: "bhr", OM: "omn", JO: "jor", EG: "egy", IQ: "irq", SY: "syr",
  LB: "lbn", PS: "pse", YE: "yem", SD: "sdn", LY: "lby", TN: "tun", DZ: "dza", MA: "mar", MR: "mrt", SO: "som",
  DJ: "dji", KM: "com", TR: "tur",
};
export const STAFF_DOMAIN = "staff.mycase.invalid";

// office code from the country (passport code) and the registration number (letters and digits only)
export const officeLoginCode = (country?: string | null, reg?: string | null) => {
  const r = String(reg || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  return r ? `${ISO3[country || "QA"] || "qat"}${r}` : "";
};
export const validUser = (u: string) => /^[a-z][a-z0-9._-]{1,29}$/.test(u);
// a login ID has no dot after @ (an e-mail address does)
export const isStaffId = (s: string) => /^[^\s@]+@[a-z0-9]+$/i.test(s.trim());
export const staffEmail = (user: string, code: string) => `${user}@${code}.${STAFF_DOMAIN}`.toLowerCase();
export const toAuthEmail = (s: string) => {
  const t = s.trim().toLowerCase();
  if (!isStaffId(t)) return t;
  const [u, c] = t.split("@");
  return staffEmail(u, c);
};
export const isStaffEmail = (e?: string | null) => !!e && e.toLowerCase().endsWith("." + STAFF_DOMAIN);

// readable temporary password: no 0/O or 1/l/I
export function tempPassword() {
  const A = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = new Uint32Array(10);
  crypto.getRandomValues(b);
  return Array.from(b, (n) => A[n % A.length]).join("");
}
