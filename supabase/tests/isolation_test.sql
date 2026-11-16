\set ON_ERROR_STOP 0
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x'),('22222222-2222-2222-2222-222222222222','b@x'),('33333333-3333-3333-3333-333333333333','v@x');
set role authenticated;
-- user A creates office A, user B creates office B
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select create_office('مكتب أ','عبد الغني') as oa \gset
insert into cases(office_id,case_no,case_type) values (:'oa','888 - 2026','ابتدائي مدني كلي') returning id as ca \gset
insert into parties(case_id,office_id,side,role,name) values (:'ca',:'oa',1,'المدعي','شركة أ');
select (issue_ref_number(:'oa','محضر اجتماع',:'ca')).seq as n1;
select (issue_ref_number(:'oa','تقرير',:'ca')).seq as n2;
insert into activity(office_id,action) values (:'oa','إنشاء دعوى');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select create_office('مكتب ب','خالد') as ob \gset
\echo '--- B sees only own office:'
select count(*) as b_sees_cases_of_A from cases where office_id=:'oa';
select count(*) as b_sees_parties_of_A from parties;
select count(*) as b_sees_offices from offices;
\echo '--- B tries to write into A (each should fail or affect 0):'
insert into cases(office_id,case_no) values (:'oa','X');
update cases set case_no='hacked' where id=:'ca';
select issue_ref_number(:'oa','x');
insert into cases(office_id,case_no) values (:'ob','1 - 2026') returning id as cb \gset
insert into parties(case_id,office_id,role,name) values (:'ca',:'ob','x','smuggle');
\echo '--- B numbering starts at 1 independently:'
select (issue_ref_number(:'ob','x',:'cb')).seq as b_n1;
\echo '--- back to A: activity is append-only, numbers cannot be deleted/renumbered:'
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select case_no from cases where id=:'ca';
update activity set action='edited';
delete from activity;
select count(*) as activity_rows from activity;
delete from ref_numbers;
select count(*) as ref_rows_after_delete from ref_numbers;
update ref_numbers set seq=99 where seq=1;
update ref_numbers set status='ملغى' where seq=1 returning seq,status;
\echo '--- viewer role cannot write:'
reset role; insert into members(office_id,user_id,role,display_name) values (:'oa','33333333-3333-3333-3333-333333333333','viewer','مطلع'); set role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select count(*) as viewer_sees_cases from cases;
insert into cases(office_id,case_no) values (:'oa','v');
\echo '--- anon sees nothing:'
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select count(*) as anon_cases from cases;
