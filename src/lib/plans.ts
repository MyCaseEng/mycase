// Opening prices (to be confirmed after talking to experts). Yearly = 10 months.
export type Plan = { key: string; name: string; who: string; monthly: number; users: number; reads: number };
export const PLANS: Plan[] = [
  { key: "basic", name: "أساسية", who: "خبير منفرد أو مع مساعد", monthly: 149, users: 2, reads: 15 },
  { key: "office", name: "مكتب", who: "مكتب بفريق صغير", monthly: 299, users: 6, reads: 40 },
  { key: "large", name: "مكتب كبير", who: "مكتب بعدة خبراء", monthly: 549, users: 15, reads: 100 },
];
export const yearly = (p: Plan) => p.monthly * 10;
export const CURRENCY = "ر.ق";
