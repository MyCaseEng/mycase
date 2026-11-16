# MyCase

منصة إدارة دعاوى الخبرة الهندسية — تطبيق ويب تقدّمي (PWA) يُفتح من المتصفح أو يُثبَّت كأيقونة.

- الواجهة: Next.js (App Router) + TypeScript + Tailwind، عربية RTL.
- البيانات والدخول والملفات: Supabase (عزل المكاتب بقواعد RLS).
- الاستضافة: Vercel.

## التشغيل محلياً

```bash
cp .env.example .env.local   # ثم ضع قيم مشروع Supabase
npm install
npm run dev
```

## تغيير الاسم والأيقونة

- الاسم والألوان: `src/lib/brand.ts`
- الأيقونات: `public/icons/`

## المراجع

- وثيقة المواصفات وخطة البناء: https://claude.ai/artifact/KzEf8AoLRV4QABAWaVsPTr
- النموذج الأول (للمرجع فقط): `reference/prototype-index.html`
