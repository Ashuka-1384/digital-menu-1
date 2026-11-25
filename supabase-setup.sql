-- ============================================================
-- راه‌اندازی دیتابیس منو — کل این فایل را در
-- Supabase > SQL Editor کپی و Run کنید (فقط یک بار)
-- ============================================================

create table if not exists categories (
  id   text primary key,
  name text not null,
  sort int  not null default 0
);

create table if not exists items (
  id          text primary key,
  category_id text not null references categories(id) on delete cascade,
  name        text not null,
  description text default '',
  price       numeric default 0,
  image_url   text default '',
  available   boolean default true,
  sort        int not null default 0
);

-- دسترسی کامل بدون لاگین (طبق درخواست: امنیت مهم نیست)
alter table categories enable row level security;
alter table items      enable row level security;

drop policy if exists "open categories" on categories;
drop policy if exists "open items" on items;
create policy "open categories" on categories for all using (true) with check (true);
create policy "open items"      on items      for all using (true) with check (true);

-- باکت عمومی برای عکس‌ها
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

drop policy if exists "open menu images" on storage.objects;
create policy "open menu images" on storage.objects
  for all using (bucket_id = 'menu-images') with check (bucket_id = 'menu-images');

-- داده‌های اولیه (از menu.json قبلی)؛ بعداً از داخل منو ویرایششان کنید
insert into categories (id, name, sort) values
  ('starters','پیش‌غذا',1), ('mains','غذای اصلی',2),
  ('drinks','نوشیدنی',3),   ('desserts','دسر',4)
on conflict (id) do nothing;

insert into items (id, category_id, name, description, price, sort) values
  ('item-olive','starters','زیتون مزه‌دار','زیتون سبز، سبزی معطر، لیمو و روغن زیتون',185000,1),
  ('item-chicken','mains','مرغ گریل شده','مرغ گریل، سبزیجات فصلی و سس مخصوص سرآشپز',395000,1),
  ('item-pasta','mains','پاستا آلفردو','پاستای تازه، سس خامه‌ای، قارچ و پارمزان',345000,2),
  ('item-latte','drinks','لاته','اسپرسو با شیر بخار داده شده و فوم لطیف',155000,1),
  ('item-cheesecake','desserts','چیزکیک سن‌سباستین','بافت خامه‌ای، رویه برشته و شیرینی متعادل',225000,1)
on conflict (id) do nothing;
