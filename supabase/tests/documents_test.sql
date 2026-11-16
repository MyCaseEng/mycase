insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x'),('22222222-2222-2222-2222-222222222222','m@x');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) \g /dev/null
select create_office('م','ع') as o \gset
insert into templates(office_id,kind,content,file_name) values (:'o','questions','AAAA','q.docx');
insert into templates(office_id,kind,assign_src,content,file_name) values (:'o','questions','assoc','BBBB','q2.docx');
\echo 'duplicate general template (should fail):'
insert into templates(office_id,kind,content,file_name) values (:'o','questions','CCCC','q3.docx');
reset role; insert into members(office_id,user_id,role,display_name) values (:'o','22222222-2222-2222-2222-222222222222','member','عضو'); set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
\echo 'member reads templates / tries to replace (0 rows):'
select count(*) from templates;
update templates set content='hack' where kind='questions';
insert into cases(office_id,case_no) values (:'o','1 - 2026') returning id as c \gset
insert into procedures(case_id,office_id,auto_key,body) values (:'c',:'o','assign','نص معدل');
\echo 'second override for same key (should fail):'
insert into procedures(case_id,office_id,auto_key,hidden) values (:'c',:'o','assign',true);
update cases set proc_num='time' where id=:'c';
select proc_num from cases;
