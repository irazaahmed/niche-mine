-- Lower the default daily AI call allowance from 50 to 20. Only resets
-- users still sitting at the old default — anyone an admin has already
-- given a custom limit keeps it.
alter table public.users alter column ai_calls_limit set default 20;
update public.users set ai_calls_limit = 20 where ai_calls_limit = 50;
