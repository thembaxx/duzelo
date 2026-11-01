-- Public discovery uses only published coarse town markers. Private base-point
-- membership/distance would allow an adversary to triangulate a worker's home.
begin;
create function private.search_worker_cards(
 p_category uuid,p_town uuid,p_lon double precision,p_lat double precision,
 p_radius integer,p_available boolean,p_trade boolean,p_sort text,p_limit integer,p_offset integer
) returns table(slug text,name text,bio text,town text,longitude double precision,latitude double precision,available boolean,identity_reviewed boolean,business_reviewed boolean,avatar_id uuid,categories jsonb,distance_band text)
language plpgsql volatile security invoker set search_path='' as $$
begin
 if p_radius is null or p_radius not between 5 and 150 or p_limit is null or p_limit not between 1 and 21 or p_offset is null or p_offset not between 0 and 1000 or p_sort not in ('name','distance') or p_sort is null
 or (p_lon is null)<>(p_lat is null) or p_lon not between 16 and 33 or p_lat not between -35 and -22
 or p_lon in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) or p_lat in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8) then raise exception 'Invalid discovery bounds' using errcode='22023';end if;
 return query
 with candidates as (
  select c.*,w.business_id,app.revision,private.eligible_worker_categories(c.worker_id) as eligible,
   case when p_lon is not null then extensions.st_distance(c.approx_marker,extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography) end as metres
  from public.worker_cards c join public.worker_profiles w on w.id=c.worker_id
  join private.worker_applications app on app.worker_id=w.id and app.state='reviewed'
  where c.safe_until>now() and c.approx_marker is not null
  and (not p_available or c.is_available)
  and (p_town is null or exists(select 1 from public.service_areas a where a.id=p_town and a.active and a.label=c.town_label))
  and (p_lon is null or extensions.st_dwithin(c.approx_marker,extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography,p_radius*1000))
 )
 select c.slug,c.public_name,c.short_bio,c.town_label,
  extensions.st_x(c.approx_marker::extensions.geometry),extensions.st_y(c.approx_marker::extensions.geometry),
  c.is_available,c.verified_identity,c.business_id is not null,
  (select a.id from private.worker_assets a where a.worker_id=c.worker_id and a.application_revision=c.revision and a.kind='avatar' and a.state='stored' and a.public_approved and a.retain_until>now() limit 1),
  (select jsonb_agg(jsonb_build_object('id',s.id,'label',s.label_en,'tradeReviewed',s.requires_trade_review and s.id=any(c.verified_trade_category_ids)) order by s.label_en) from public.service_categories s where s.active and s.id=any(c.category_ids) and s.id=any(c.eligible)),
  case when c.metres is null then null when c.metres<5000 then 'Within about 5 km' when c.metres<15000 then 'About 5–15 km' when c.metres<30000 then 'About 15–30 km' when c.metres<60000 then 'About 30–60 km' else 'About 60–150 km' end
 from candidates c
 where cardinality(c.eligible)>0 and c.category_ids && c.eligible
 and (p_category is null or (p_category=any(c.category_ids) and p_category=any(c.eligible)))
 and (not p_trade or (case when p_category is null then c.verified_trade_category_ids && c.eligible else p_category=any(c.verified_trade_category_ids) and p_category=any(c.eligible) end))
 order by case when p_sort='distance' then c.metres end nulls last,lower(c.public_name),c.worker_id
 limit p_limit offset p_offset;
end;$$;
revoke all on function private.search_worker_cards(uuid,uuid,float8,float8,integer,boolean,boolean,text,integer,integer) from public,anon,authenticated;
grant execute on function private.search_worker_cards(uuid,uuid,float8,float8,integer,boolean,boolean,text,integer,integer) to service_role;
commit;
