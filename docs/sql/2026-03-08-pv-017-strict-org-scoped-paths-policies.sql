begin;

-- Parse org_id from storage object path prefix: "<org_uuid>/..."
create or replace function public.path_org_id(path text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  first_segment text;
begin
  if path is null or path = '' then
    return null;
  end if;

  first_segment := split_part(path, '/', 1);
  if first_segment is null or first_segment = '' then
    return null;
  end if;

  begin
    return first_segment::uuid;
  exception
    when others then
      return null;
  end;
end;
$$;

-- Enforce DB asset rows to remain org-scoped by path.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_storage_path_org_scope_check'
  ) then
    alter table public.assets
      add constraint assets_storage_path_org_scope_check
      check (storage_path like (org_id::text || '/%'));
  end if;
end $$;

-- Storage hardening for bucket "originals" using org-scoped path prefix.
-- Note: some projects cannot alter storage.objects ownership from this SQL role.
-- Supabase Storage already has RLS enabled by default, so we do not force-enable here.

do $$
begin
  begin
    if exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'objects_select_org_scoped_originals'
    ) then
      drop policy objects_select_org_scoped_originals on storage.objects;
    end if;

    create policy objects_select_org_scoped_originals
      on storage.objects
      for select
      to public
      using (
        bucket_id = 'originals'
        and (
          public.is_super_admin()
          or public.is_org_viewer(public.path_org_id(name))
        )
      );
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage select policy update: insufficient privileges on storage.objects';
  end;
end $$;

do $$
begin
  begin
    if exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'objects_insert_org_scoped_originals'
    ) then
      drop policy objects_insert_org_scoped_originals on storage.objects;
    end if;

    create policy objects_insert_org_scoped_originals
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'originals'
        and (
          public.is_super_admin()
          or public.is_org_uploader(public.path_org_id(name))
        )
      );
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage insert policy update: insufficient privileges on storage.objects';
  end;
end $$;

do $$
begin
  begin
    if exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'objects_update_org_scoped_originals'
    ) then
      drop policy objects_update_org_scoped_originals on storage.objects;
    end if;

    create policy objects_update_org_scoped_originals
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'originals'
        and (
          public.is_super_admin()
          or public.is_org_owner(public.path_org_id(name))
        )
      )
      with check (
        bucket_id = 'originals'
        and (
          public.is_super_admin()
          or public.is_org_owner(public.path_org_id(name))
        )
      );
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage update policy update: insufficient privileges on storage.objects';
  end;
end $$;

do $$
begin
  begin
    if exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'objects_delete_org_scoped_originals'
    ) then
      drop policy objects_delete_org_scoped_originals on storage.objects;
    end if;

    create policy objects_delete_org_scoped_originals
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'originals'
        and (
          public.is_super_admin()
          or public.is_org_owner(public.path_org_id(name))
        )
      );
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage delete policy update: insufficient privileges on storage.objects';
  end;
end $$;

commit;
