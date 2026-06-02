-- ════════════════════════════════════════════════════════════════
-- وحدة تخصيص السائقين للمركبات (Driver ↔ Vehicle Assignments)
-- شغّل هذا السكربت في Supabase → SQL Editor مرة واحدة
-- ════════════════════════════════════════════════════════════════

-- 1) عمود المركبة المخصّصة حالياً على جدول السائقين (للوصول السريع)
alter table public.drivers
  add column if not exists assigned_vehicle_id uuid references public.vehicles(id) on delete set null;

-- 2) جدول سجل التخصيصات (history)
create table if not exists public.driver_assignments (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references public.drivers(id)  on delete cascade,
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  released_at  timestamptz,                 -- null = تخصيص نشط حالياً
  note         text,
  created_at   timestamptz not null default now()
);

-- فهارس للبحث السريع
create index if not exists idx_assignments_driver  on public.driver_assignments (driver_id);
create index if not exists idx_assignments_vehicle on public.driver_assignments (vehicle_id);
create index if not exists idx_assignments_active  on public.driver_assignments (released_at) where released_at is null;

-- 3) صلاحيات RLS (نفس نمط بقية الجداول — عدّلها حسب سياساتك)
alter table public.driver_assignments enable row level security;

drop policy if exists "assignments_read"  on public.driver_assignments;
drop policy if exists "assignments_write" on public.driver_assignments;

-- قراءة لكل مستخدم مُسجّل دخول
create policy "assignments_read" on public.driver_assignments
  for select using (auth.role() = 'authenticated');

-- كتابة/تعديل/حذف لكل مستخدم مُسجّل دخول (قيّدها لاحقاً للأدوار admin/editor إن رغبت)
create policy "assignments_write" on public.driver_assignments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
