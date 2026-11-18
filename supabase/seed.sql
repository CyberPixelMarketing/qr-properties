-- =====================================================================
-- Demo data: 2 advertisers, 1 building with 3 units, 5 apartments across Dubai.
-- For local/staging use. Run AFTER the migrations:
--   supabase db reset          (local CLI applies seed.sql automatically)
--   or paste into the SQL editor of a NON-production project.
-- Demo logins (change or delete before going live):
--   demo-office@qrprops.test / DemoPass!2026
--   demo-agent@qrprops.test  / DemoPass!2026
-- Photos are not seeded (Storage files can't be created from SQL); cards show a placeholder.
-- =====================================================================

do $$
declare
  u_office uuid := '0f6c3a1e-1111-4a5b-9c01-000000000001';
  u_agent  uuid := '0f6c3a1e-2222-4a5b-9c01-000000000002';
  b_jlt    uuid := '0f6c3a1e-3333-4a5b-9c01-000000000003';
begin
  -- ---------- Auth users (the on_auth_user_created trigger creates profiles + free subscriptions) ----------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', u_office, 'authenticated', 'authenticated', 'demo-office@qrprops.test',
     extensions.crypt('DemoPass!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Al Waha Properties"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', u_agent, 'authenticated', 'authenticated', 'demo-agent@qrprops.test',
     extensions.crypt('DemoPass!2026', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Al Mansoori"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (u_office::text, u_office, jsonb_build_object('sub', u_office::text, 'email', 'demo-office@qrprops.test', 'email_verified', true), 'email', now(), now(), now()),
    (u_agent::text,  u_agent,  jsonb_build_object('sub', u_agent::text,  'email', 'demo-agent@qrprops.test',  'email_verified', true), 'email', now(), now(), now())
  on conflict do nothing;

  -- ---------- Profiles ----------
  update public.profiles set
    account_type = 'office', display_name = 'الواحة للعقارات | Al Waha Properties', slug = 'al-waha-properties',
    bio = 'مكتب عقاري في دبي متخصص في الشقق السكنية للبيع والإيجار منذ 2012.',
    phone = '+971 4 000 0001', whatsapp = '+971500000001', contact_email = 'demo-office@qrprops.test',
    onboarded_at = now()
  where id = u_office;

  update public.profiles set
    account_type = 'individual', display_name = 'سارة المنصوري | Sara Al Mansoori', slug = 'sara-almansoori',
    bio = 'وسيطة عقارية مستقلة في دبي.',
    phone = '+971500000002', whatsapp = '+971500000002', contact_email = 'demo-agent@qrprops.test',
    onboarded_at = now()
  where id = u_agent;

  insert into public.credential_links (profile_id, label, url, sort_order) values
    (u_office, 'رخصة تجارية', 'https://example.com/licence/al-waha', 0),
    (u_office, 'Instagram', 'https://instagram.com/example', 1),
    (u_agent,  'Broker card', 'https://example.com/broker/sara', 0)
  on conflict do nothing;

  -- ---------- Building in JLT with 3 units (units inherit its location) ----------
  insert into public.listings (id, owner_id, kind, status, title, description, address_text, maps_url, lat, lng)
  values (b_jlt, u_office, 'building', 'published', 'برج الواحة - JLT',
          'بناية سكنية حديثة قرب محطة المترو مع مسبح ونادي رياضي.', 'أبراج بحيرات جميرا، كلستر X',
          'https://www.google.com/maps?q=25.069300,55.141300', 25.0693, 55.1413)
  on conflict (id) do nothing;

  insert into public.listings (owner_id, kind, building_id, purpose, status, title, price_aed, bedrooms, bathrooms, area_sqft)
  values
    (u_office, 'unit', b_jlt, 'rent', 'published', 'وحدة 1203 - غرفة وصالة', 85000, 1, 1, 780),
    (u_office, 'unit', b_jlt, 'rent', 'published', 'وحدة 1507 - غرفتين وصالة', 120000, 2, 2, 1150),
    (u_office, 'unit', b_jlt, 'sale', 'published', 'وحدة 2201 - استوديو', 620000, 0, 1, 450);

  -- ---------- 5 apartments in different Dubai areas ----------
  insert into public.listings (owner_id, kind, purpose, status, title, description, price_aed, bedrooms, bathrooms, area_sqft, address_text, maps_url, lat, lng)
  values
    (u_office, 'apartment', 'sale', 'published', 'شقة غرفتين بإطلالة على المارينا', 'مفروشة بالكامل، شرفة كبيرة.',
     1850000, 2, 3, 1300, 'دبي مارينا', 'https://www.google.com/maps?q=25.080500,55.140300', 25.0805, 55.1403),
    (u_office, 'apartment', 'rent', 'published', 'شقة غرفة وصالة في داون تاون', 'إطلالة على برج خليفة.',
     135000, 1, 2, 870, 'داون تاون دبي', 'https://www.google.com/maps?q=25.197200,55.274400', 25.1972, 55.2744),
    (u_office, 'apartment', 'sale', 'published', 'شقة 3 غرف في الخليج التجاري', 'تشطيب فاخر، موقفين.',
     2900000, 3, 4, 2100, 'الخليج التجاري', 'https://www.google.com/maps?q=25.186500,55.263700', 25.1865, 55.2637),
    (u_agent, 'apartment', 'rent', 'published', 'استوديو في قرية جميرا الدائرية', 'قريب من الخدمات، مناسب للأفراد.',
     48000, 0, 1, 420, 'قرية جميرا الدائرية', 'https://www.google.com/maps?q=25.060900,55.209800', 25.0609, 55.2098),
    (u_agent, 'apartment', 'sale', 'published', 'شقة غرفتين على نخلة جميرا', 'وصول مباشر للشاطئ.',
     4200000, 2, 3, 1650, 'نخلة جميرا', 'https://www.google.com/maps?q=25.112400,55.138900', 25.1124, 55.1389);
end $$;
