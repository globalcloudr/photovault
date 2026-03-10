begin;

alter table public.assets enable row level security;

drop policy if exists assets_select_member on public.assets;
create policy assets_select_member
on public.assets
for select
to public
using (public.is_org_viewer(org_id) or public.is_super_admin());

drop policy if exists assets_insert_uploader on public.assets;
create policy assets_insert_uploader
on public.assets
for insert
to public
with check (public.is_org_uploader(org_id) or public.is_super_admin());

drop policy if exists assets_update_owner on public.assets;
create policy assets_update_owner
on public.assets
for update
to public
using (public.is_org_owner(org_id) or public.is_super_admin())
with check (public.is_org_owner(org_id) or public.is_super_admin());

drop policy if exists assets_delete_owner on public.assets;
create policy assets_delete_owner
on public.assets
for delete
to public
using (public.is_org_owner(org_id) or public.is_super_admin());

commit;
