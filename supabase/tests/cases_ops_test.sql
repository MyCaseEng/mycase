insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) \g /dev/null
select create_office('م','ع') as o \gset
insert into cases(office_id,case_no,assign_src,created_by) values (:'o','888 - 2026','assoc',auth.uid()) returning id as c \gset
insert into parties(case_id,office_id,role,side,name,sort) values (:'c',:'o','المدعي',1,'شركة',0);
insert into case_team(case_id,office_id,user_id,duty) values (:'c',:'o',auth.uid(),'executor');
insert into events(case_id,office_id,type,date,note) values (:'c',:'o','جلسة','2026-12-01','لسداد الأمانة');
insert into notes(case_id,office_id,body) values (:'c',:'o','ملاحظة');
insert into activity(office_id,action,case_id) values (:'o','إنشاء دعوى',:'c');
update cases set report_date='2026-11-16', status='تم التسليم' where id=:'c';
update cases set deleted_at=now() where id=:'c';
select case_no, assign_src, updated_by is not null as touched, deleted_at is not null as trashed from cases;
