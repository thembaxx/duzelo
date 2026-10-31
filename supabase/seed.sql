-- Public taxonomy only; never seed fake verified workers or fabricated reviews.
begin;
insert into public.service_categories (slug,label_en,requires_trade_review,sort_order)
values
 ('home-repairs','Home repairs',false,10),
 ('plumbing','Plumbing',true,20),
 ('electrical','Electrical',true,30),
 ('cleaning','Cleaning',false,40),
 ('gardening','Gardening',false,50),
 ('painting','Painting',false,60)
on conflict (slug) do update
set label_en=excluded.label_en, requires_trade_review=excluded.requires_trade_review,
    sort_order=excluded.sort_order;
commit;
