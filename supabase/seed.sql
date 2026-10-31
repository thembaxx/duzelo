-- Fictional category catalogue only. DO NOT seed pretend workers, ratings or accounts.
-- Local development seed. Client-visible taxonomy may be expanded in a reviewed PR.
insert into public.service_categories (slug,label_en,requires_trade_review,sort_order)
values
 ('home-repairs','Home repairs',false,10),
 ('plumbing','Plumbing',true,20),
 ('electrical','Electrical',true,30),
 ('cleaning','Cleaning',false,40),
 ('gardening','Gardening',false,50),
 ('painting','Painting',false,60),
 ('locksmithing','Locksmithing',true,70),
 ('window-installation','Window installation',true,80),
 ('installations','Installations and maintenance',false,90)
on conflict (slug) do nothing;
