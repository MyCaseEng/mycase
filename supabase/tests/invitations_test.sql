insert into auth.users values ('11111111-1111-1111-1111-111111111111','admin@x.com'),('22222222-2222-2222-2222-222222222222','khaled@x.com'),('33333333-3333-3333-3333-333333333333','evil@x.com');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select create_office('مكتب أ','عبد الغني') as oa \gset
insert into invitations(office_id,email,display_name) values (:'oa',' Khaled@X.com ','خالد');
\echo 'admin demotes self (should fail):'
update members set role='member' where user_id=auth.uid();
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
\echo 'outsider: invitations visible / accept count:'
select count(*) from invitations; select accept_invitations();
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
\echo 'invited khaled accepts:'
select accept_invitations(); select role, display_name from members where user_id=auth.uid();
insert into invitations(office_id,email,display_name) values (:'oa','evil@x.com','x');
reset role; delete from offices; select count(*) as members_left from members;
