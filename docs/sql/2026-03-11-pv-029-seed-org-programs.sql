begin;

with default_programs(code, name, sort_order) as (
  values
    ('AWD', 'Adults with Disabilities', 10),
    ('AAP', 'Active Adults Program', 20),
    ('ASE', 'Adult Secondary Education', 30),
    ('ABE', 'Adult Basic Education', 40),
    ('CE', 'Career Education', 50),
    ('CTE', 'Career Technical Education', 60),
    ('ESL', 'English as a Second Language', 70),
    ('HSD', 'High School Diploma', 80),
    ('HiSET', 'High School Equivalency', 90),
    ('CC', 'Community Classes', 100)
)
insert into public.org_departments (org_id, code, name, sort_order, is_active)
select
  organizations.id,
  default_programs.code,
  default_programs.name,
  default_programs.sort_order,
  true
from public.organizations
cross join default_programs
where not exists (
  select 1
  from public.org_departments
  where org_departments.org_id = organizations.id
    and org_departments.code = default_programs.code
);

commit;
