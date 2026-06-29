-- تبديل قيد التفرّد في جدول vehicles من plate_number إلى chassis_number
-- شغّل هذا مرة واحدة في Supabase → SQL Editor قبل رفع الملف بالتكرارات.

-- 1) إزالة أي قيد تفرّد (unique constraint) على plate_number مهما كان اسمه
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.vehicles'::regclass
      AND contype = 'u'
      AND conkey = ARRAY(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.vehicles'::regclass AND attname = 'plate_number'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.vehicles DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'أُزيل القيد: %', r.conname;
  END LOOP;
END $$;

-- إزالة أي فهرس فريد على plate_number لو كان index وليس constraint
DROP INDEX IF EXISTS public.vehicles_plate_number_key;

-- 2) إضافة قيد تفرّد على chassis_number (لازم للـ upsert على هذا العمود)
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_chassis_number_key UNIQUE (chassis_number);
