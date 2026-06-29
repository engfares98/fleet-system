# سجل التغييرات — نظام إدارة الأسطول

ملف توثيقي بكل التحسينات اللي تمت على النظام.

---

## 📋 جدول المحتويات

1. [نموذج تقرير تحضير المعدات (PDF)](#1-تقرير-تحضير-المعدات)
2. [نظام المرفقات لكل مركبة (6 أنواع)](#2-نظام-المرفقات)
3. [الفلاتر الشاملة لكل القوائم](#3-الفلاتر-الشاملة)
4. [فلتر لكل عمود (Excel-style)](#4-فلتر-كل-عمود)
5. [عمود رقم الهيكل](#5-عمود-رقم-الهيكل)
6. [إعادة التصميم + Dark Mode](#6-إعادة-التصميم)
7. [المرحلة 1: Toast + Skeleton + Shortcuts + DragDrop + SidePanel + Tour](#7-المرحلة-1)
8. [المرحلة 2: Global Search + Dashboard تفاعلي](#8-المرحلة-2)
9. [أوامر الإدارة من PowerShell](#9-أوامر-الإدارة)
10. [اختصارات لوحة المفاتيح](#10-اختصارات-لوحة-المفاتيح)

---

## 1. تقرير تحضير المعدات

**الملف:** `app/dashboard/PrepReport.js`

تبويب جديد في صفحة التقارير لإصدار PDF.

**الميزات:**
- اختيار المنطقة (الكل / شمال / جنوب / شرق / غرب)
- فلتر حالة التجهيز (جاهزة / قيد التجهيز / غير جاهزة)
- بحث برقم اللوحة، الكود، الماركة
- اختيار عدة مركبات بـ checkbox
- لكل مركبة: اختيار السائق المخصص
- معاينة قبل الإصدار
- توليد PDF بشعار الأمانة + المجال
- مشاركة عبر Web Share API
- اسم الملف: `Equipment_Preparation_Report - {Region} - {Date}.pdf`

**المكتبات:** `jspdf`, `html-to-image`

---

## 2. نظام المرفقات

**الملف:** `app/dashboard/AttachmentMenu.js`

عمود "المرفقات" في جدول المركبات يستبدل عمود "الاستمارة" القديم.

**أنواع المرفقات (6):**
1. الاستمارة (`istimara_image`)
2. بطاقة التشغيل (`operation_card_image`)
3. الفحص الدوري (`periodic_inspection_image`)
4. شهادة ختم الحاجز (`barrier_seal_image`)
5. صورة المركبة (`vehicle_image`)
6. سند استلام المركبة (`handover_receipt_image`)

**الميزات:**
- Dropdown لكل مركبة يعرض: 📎 المرفقات (3/6) — العداد
- ✅ موجود / ⬆️ غير موجود لكل نوع
- Modal فيه: عرض، تحميل، استبدال
- يدعم الصور و PDF (iframe للـ PDF)
- زر **رفع جماعي** ▼ لكل نوع — يطابق اسم الملف برقم اللوحة

**SQL المطلوب:**
```sql
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS operation_card_image text,
  ADD COLUMN IF NOT EXISTS periodic_inspection_image text,
  ADD COLUMN IF NOT EXISTS barrier_seal_image text,
  ADD COLUMN IF NOT EXISTS handover_receipt_image text;
```

---

## 3. الفلاتر الشاملة

فلاتر أعلى كل جدول:

**🚛 المركبات:** المنطقة، حالة التجهيز، الحالة، الماركة، حالة المرفقات، البحث
**👤 السائقون:** الحالة، حالة الرخصة (سارية/تنتهي/منتهية)، البحث
**🔧 الصيانة:** الحالة، المركبة، نطاق التاريخ، البحث
**⛽ الوقود:** المركبة، السائق، نطاق التاريخ، البحث

---

## 4. فلتر كل عمود

**الملف:** `app/dashboard/ColumnFilter.js`

أيقونة ▼ في رأس كل عمود — اضغط عليها يفتح Popup مع:
- **حقل نصي** للأعمدة النصية
- **قائمة منسدلة** للأعمدة المحدودة
- **نطاق تاريخ** للأعمدة الزمنية
- زر مسح / تم

تتحوّل الأيقونة إلى **برتقالي** لما الفلتر مفعّل.

**فلتر المرفقات الذكي:** يدعم اختيار "الاستمارة موجودة" أو "بطاقة التشغيل مفقودة" لكل نوع.

---

## 5. عمود رقم الهيكل

عمود جديد `chassis_number` للمركبات.

**SQL:**
```sql
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number text;
```

**ظاهر في:**
- جدول المركبات (بعد عمود نوع التجهيزة)
- نموذج إضافة مركبة
- نموذج تعديل مركبة
- البحث (search)
- التصدير (CSV / Excel)
- ملف `download-vehicles.js` و `upload-vehicles.js`

---

## 6. إعادة التصميم

**الملفات:** `app/globals.css`, `app/dashboard/page.js`

**نظام ثيم كامل بـ CSS Variables:**
- **Light Mode:** خلفية `#f5f6fa`، سطح `#fff`، نص `#0f0f10`
- **Dark Mode:** خلفية `#07080b`، سطح `#13151b`، نص `#f1f3f5`
- زر تبديل (☀ / 🌙) في التوب بار
- يحفظ التفضيل في localStorage (افتراضياً Dark)

**تحسينات بصرية:**
- ظلال احترافية (sm/md/lg/xl)
- Backdrop blur للـ Modals
- Glassmorphism للتوب بار
- Focus rings برتقالية
- Hover effects ناعمة
- Animations: fadeIn, slideUp, scaleIn, shimmer
- Scrollbar مخصص

**أيقونات SVG رسمية** للسايدبار بدل الإيموجي.

---

## 7. المرحلة 1

ستة مكونات جديدة:

### 7.1 Toast Notifications
نظام تنبيهات أنيق (success/error/warning/info) موجود في `page.js`.

### 7.2 Skeleton Loading
**`app/dashboard/Skeleton.js`** — `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonTable`, `SkeletonStats`.

### 7.3 Side Panel (Drawer)
**`app/dashboard/SidePanel.js`** — Drawer ينزلق من الجانب بدل Modals.

### 7.4 Keyboard Shortcuts
**`app/dashboard/KeyboardShortcuts.js`** — اختصارات شاملة (انظر القائمة أدناه).

### 7.5 Drag & Drop
**`app/dashboard/DropZone.js`** — مكون لرفع الصور بالسحب والإفلات.

### 7.6 Onboarding Tour
**`app/dashboard/OnboardingTour.js`** — جولة تعريفية لأول دخول (8 خطوات + Progress bar).

---

## 8. المرحلة 2

### 8.1 Global Search (Ctrl+K)
**`app/dashboard/GlobalSearch.js`** — بحث شامل في كل البيانات:
- ⌨️ Ctrl+K يفتحه
- 🔍 يبحث في المركبات + السائقين + الصيانة + الوقود
- 🏷️ شارة ملونة لكل نوع نتيجة
- ⌨️ تنقل بـ ↑↓ وفتح بـ Enter
- 📊 عداد لكل نوع

### 8.2 Interactive Dashboard
**`app/dashboard/InteractiveDashboard.js`** — لوحة تحكم تفاعلية:

**Insights الذكية:**
- أعلى مركبة استهلاكاً
- نسبة تغيّر استهلاك الوقود
- عدد السائقين برخصة منتهية
- عدد المركبات غير الجاهزة

**4 بطاقات إحصائيات** مع trends (▲▼).

**5 رسوم بيانية:**
1. استهلاك الوقود (Area chart - 6 أشهر)
2. جاهزية المركبات (Pie chart)
3. أعلى 5 مركبات استهلاكاً (Bar chart أفقي)
4. تكلفة الصيانة (Line chart)
5. توزيع المركبات حسب المنطقة (Bar chart)

**المكتبة:** `recharts`

---

## 9. أوامر الإدارة

سكريبتات `node` للإدارة من PowerShell:

| السكريبت | الوظيفة |
|---------|---------|
| `node download-vehicles.js` | تحميل كل المركبات إلى `vehicles_template.xlsx` |
| `node upload-vehicles.js` | رفع المركبات من Excel إلى DB (مع `upsert` على رقم اللوحة) |
| `node check-chassis.js` | فحص أرقام الهياكل في الإكسل |
| `node update-chassis.js` | تحديث أرقام الهياكل في DB من الإكسل |
| `node cleanup-duplicates.js` | حذف المركبات المكررة |
| `node sync-vehicles-to-excel.js` | حذف من DB أي مركبة ليست في الإكسل |

---

## 10. اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Ctrl + K` | البحث السريع |
| `Ctrl + N` | إضافة مركبة جديدة |
| `Ctrl + D` | لوحة التحكم |
| `Ctrl + V` | المركبات |
| `Ctrl + U` | السائقون |
| `Ctrl + M` | الصيانة |
| `Ctrl + F` | الوقود |
| `Ctrl + R` | التقارير |
| `Ctrl + L` | تبديل اللغة |
| `Ctrl + B` | تبديل الثيم |
| `Ctrl + /` | عرض كل الاختصارات |
| `Esc` | إغلاق النوافذ |

---

## 📅 الخطة المستقبلية

### المرحلة 2 — متبقي
- ✏️ Inline Editing (تعديل من الجدول مباشرة)
- 📦 Bulk Actions (اختيار عدة وعمل جماعي)
- 🎛️ Customizable Dashboard

### المرحلة 3
- 📜 Audit Log (سجل النشاط)
- 💾 Auto-save للنماذج
- 🔐 Login History
- 🛡️ Granular Permissions (صلاحيات لكل قسم)

### المرحلة 4
- 📧 Email Notifications (Resend)
- ✉️ Email Invitations
- 🔒 2FA للمديرين

---

## 📦 المكتبات المثبتة

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.103.3",
    "next": "16.2.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "xlsx": "^0.18.5",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "html2canvas": "^1.4.1",
    "html-to-image": "^1.11.13",
    "recharts": "^latest"
  }
}
```

---

## 🗄️ بنية قاعدة البيانات

### جدول `vehicles`
```sql
- id (uuid, PK)
- plate_number (text, UNIQUE)
- vehicle_code (text)
- type (text)
- brand (text)
- model (text)
- year (text)
- chassis_number (text)        -- جديد
- color (text)
- fuel_type (text)
- status (text)                -- active / inactive / pending
- preparation_status (text)    -- ready / in_progress / not_ready
- vehicle_image (text)
- istimara_image (text)
- operation_card_image (text)        -- جديد
- periodic_inspection_image (text)   -- جديد
- barrier_seal_image (text)          -- جديد
- handover_receipt_image (text)      -- جديد
- created_at (timestamp)
```

### جدول `drivers`
```sql
- id, file_number, full_name, national_id, passport_number,
  phone, license_number, license_expiry, status,
  iqama_image, license_image, created_at
```

### جدول `maintenance`
```sql
- id, vehicle_id (FK), type, description, date, cost,
  next_date, status, created_at
```

### جدول `fuel_logs`
```sql
- id, vehicle_id (FK), driver_id (FK), date, liters,
  cost_per_liter, total_cost, odometer, created_at
```

### جدول `user_roles`
```sql
- user_id (FK to auth.users), role (admin/editor/viewer)
```

---

تاريخ آخر تحديث: 2026-05-04
