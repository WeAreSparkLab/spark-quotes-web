-- The quotes schema and its tables were created without the standard API
-- role grants. Postgres doesn't hand these out automatically for a new
-- schema the way it does for public, so anon/authenticated had USAGE on
-- nothing and every .schema('quotes') call from the app was failing before
-- RLS was ever evaluated ("Failed to update favorite status" and similar
-- errors across every quotes-schema-backed feature). RLS policies (already
-- correctly in place per-table) remain the actual per-row security
-- boundary; these grants only get requests past the schema/table gate.
--
-- Applied directly to sparklab-apps (zckbrbqxnibzmuesqsok) on 2026-09-23;
-- this file brings the migration history in sync with that.

grant usage on schema quotes to anon, authenticated, service_role;

grant all on all tables in schema quotes to anon, authenticated, service_role;
grant all on all sequences in schema quotes to anon, authenticated, service_role;
grant all on all routines in schema quotes to anon, authenticated, service_role;

-- So tables/functions added to this schema later don't need this repeated.
alter default privileges in schema quotes grant all on tables to anon, authenticated, service_role;
alter default privileges in schema quotes grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema quotes grant all on routines to anon, authenticated, service_role;
