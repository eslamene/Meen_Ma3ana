--
-- PostgreSQL database dump
--

\restrict Vt36YzhXTmgo9IUsTSwZCljfN62008Zvkyje1jWn4c2I3xucih4kelppasvBb5Z

-- Dumped from database version 17.4
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: hypopg; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hypopg WITH SCHEMA extensions;


--
-- Name: EXTENSION hypopg; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION hypopg IS 'Hypothetical indexes for PostgreSQL';


--
-- Name: index_advisor; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS index_advisor WITH SCHEMA extensions;


--
-- Name: EXTENSION index_advisor; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION index_advisor IS 'Query index advisor';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: check_contribution_approved(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_contribution_approved(contribution_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM contribution_approval_status 
    WHERE contribution_id = contribution_id_param 
    AND status = 'approved'
  );
END;
$$;


ALTER FUNCTION public.check_contribution_approved(contribution_id_param uuid) OWNER TO postgres;

--
-- Name: cleanup_old_activity_logs(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_activity_logs(retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM site_activity_log
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND severity != 'critical'; -- Keep critical logs longer
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_activity_logs(retention_days integer) OWNER TO postgres;

--
-- Name: count_contributions(uuid, boolean, text, text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.count_contributions(p_user_id uuid DEFAULT NULL::uuid, p_is_admin boolean DEFAULT false, p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM contributions c
    LEFT JOIN cases cs ON c.case_id = cs.id
    LEFT JOIN users u ON c.donor_id = u.id
    LEFT JOIN LATERAL (
        SELECT *
        FROM contribution_approval_status
        WHERE contribution_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) cas ON true
    WHERE 
        (p_is_admin OR c.donor_id = p_user_id)
        AND (
            p_status IS NULL 
            OR p_status = 'all'
            OR (
                CASE p_status
                    WHEN 'approved' THEN cas.status = 'approved'
                    WHEN 'rejected' THEN cas.status IN ('rejected', 'revised')
                    WHEN 'pending' THEN (cas.status IS NULL OR cas.status = 'pending')
                    ELSE true
                END
            )
        )
        AND (p_date_from IS NULL OR c.created_at >= p_date_from)
        AND (p_date_to IS NULL OR c.created_at <= p_date_to)
        -- Search both title_en and title_ar for bilingual support
        AND (
            p_search IS NULL 
            OR p_search = ''
            OR (
                cs.title_en ILIKE '%' || p_search || '%'
                OR cs.title_ar ILIKE '%' || p_search || '%'
                OR u.email ILIKE '%' || p_search || '%'
                OR u.first_name ILIKE '%' || p_search || '%'
                OR u.last_name ILIKE '%' || p_search || '%'
                OR CONCAT(u.first_name, ' ', u.last_name) ILIKE '%' || p_search || '%'
            )
        );
    
    RETURN v_count;
END;
$$;


ALTER FUNCTION public.count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) OWNER TO postgres;

--
-- Name: FUNCTION count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) IS 'Count contributions matching the same filters as search_contributions for pagination support.';


--
-- Name: create_user_merge_backup(uuid, uuid, uuid, uuid, boolean, inet, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean DEFAULT false, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_backup_id UUID;
  v_backup_data JSONB := '{}'::JSONB;
  v_record_count INTEGER := 0;
  v_table_data JSONB;
  v_error_message TEXT;
BEGIN
  -- Create backup record with initial empty backup_data
  INSERT INTO user_merge_backups (
    merge_id,
    from_user_id,
    to_user_id,
    admin_user_id,
    delete_source,
    ip_address,
    user_agent,
    status,
    backup_data
  ) VALUES (
    p_merge_id,
    p_from_user_id,
    p_to_user_id,
    p_admin_user_id,
    p_delete_source,
    p_ip_address,
    p_user_agent,
    'pending',
    '{}'::JSONB  -- Initialize with empty JSONB to satisfy NOT NULL constraint
  ) RETURNING id INTO v_backup_id;

  -- Backup contributions
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM contributions WHERE donor_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('contributions', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup notifications
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM notifications WHERE recipient_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('notifications', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup recurring contributions
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM recurring_contributions WHERE donor_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('recurring_contributions', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup sponsorships
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM sponsorships WHERE sponsor_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('sponsorships', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup communications
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM communications WHERE sender_id = p_from_user_id OR recipient_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('communications', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup cases (created_by, assigned_to, sponsored_by)
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM cases WHERE created_by = p_from_user_id OR assigned_to = p_from_user_id OR sponsored_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('cases', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup case status history
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM case_status_history WHERE changed_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('case_status_history', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup case updates
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM case_updates WHERE created_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('case_updates', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup projects
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM projects WHERE created_by = p_from_user_id OR assigned_to = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('projects', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup contribution approval status
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM contribution_approval_status WHERE admin_id = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('contribution_approval_status', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup category detection rules
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM category_detection_rules WHERE created_by = p_from_user_id OR updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('category_detection_rules', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup landing stats
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM landing_stats WHERE updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('landing_stats', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup system config
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM system_config WHERE updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('system_config', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup system content
  SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
  FROM (
    SELECT * FROM system_content WHERE updated_by = p_from_user_id
  ) t;
  v_backup_data := v_backup_data || jsonb_build_object('system_content', COALESCE(v_table_data, '[]'::jsonb));
  v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);

  -- Backup site activity logs (if table exists)
  BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
    FROM (
      SELECT * FROM site_activity_log WHERE user_id = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('site_activity_log', COALESCE(v_table_data, '[]'::jsonb));
    v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Backup beneficiaries
  BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
    FROM (
      SELECT * FROM beneficiaries WHERE created_by = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('beneficiaries', COALESCE(v_table_data, '[]'::jsonb));
    v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Backup beneficiary documents (if table exists)
  BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO v_table_data
    FROM (
      SELECT * FROM beneficiary_documents WHERE uploaded_by = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('beneficiary_documents', COALESCE(v_table_data, '[]'::jsonb));
    v_record_count := v_record_count + COALESCE(jsonb_array_length(v_table_data), 0);
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;

  -- Backup source user record (if delete_source is true)
  IF p_delete_source THEN
    SELECT row_to_json(t) INTO v_table_data
    FROM (
      SELECT * FROM users WHERE id = p_from_user_id
    ) t;
    v_backup_data := v_backup_data || jsonb_build_object('source_user', v_table_data);
  END IF;

  -- Update backup record with data
  UPDATE user_merge_backups
  SET 
    backup_data = v_backup_data,
    total_records_backed_up = v_record_count
  WHERE id = v_backup_id;

  RETURN v_backup_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and update backup record with error status
    v_error_message := SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')';
    
    -- Try to update backup record with error
    BEGIN
      UPDATE user_merge_backups
      SET 
        status = 'failed',
        errors = jsonb_build_array(v_error_message)
      WHERE id = v_backup_id;
    EXCEPTION WHEN OTHERS THEN
      -- If update fails, at least log it
      RAISE NOTICE 'Failed to update backup record with error: %', SQLERRM;
    END;
    
    -- Re-raise the error with context
    RAISE EXCEPTION 'Error creating backup: %', v_error_message;
END;
$$;


ALTER FUNCTION public.create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text) OWNER TO postgres;

--
-- Name: FUNCTION create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text) IS 'Creates a comprehensive backup of all user-related data before merge operation';


--
-- Name: delete_beneficiary_with_documents(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_beneficiary_with_documents(p_beneficiary_id uuid) RETURNS TABLE(id uuid, name text, name_ar text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_case_count INTEGER;
  v_beneficiary_record RECORD;
BEGIN
  -- 1. Verify beneficiary exists and lock the row
  SELECT * INTO v_beneficiary_record
  FROM beneficiaries
  WHERE beneficiaries.id = p_beneficiary_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Beneficiary not found' USING ERRCODE = 'P0001';
  END IF;
  
  -- 2. Check if beneficiary is assigned to any cases
  -- Cases can be linked via beneficiary_id OR via beneficiary_name/beneficiary_contact
  -- We need to check all possible links
  SELECT COUNT(DISTINCT cases.id)::INTEGER INTO v_case_count
  FROM cases
  WHERE (
    -- Check by beneficiary_id
    (cases.beneficiary_id = p_beneficiary_id AND cases.beneficiary_id IS NOT NULL)
    OR
    -- Check by beneficiary_name
    (cases.beneficiary_name = v_beneficiary_record.name AND cases.beneficiary_name IS NOT NULL)
    OR
    -- Check by beneficiary_contact (mobile number)
    (cases.beneficiary_contact = v_beneficiary_record.mobile_number AND cases.beneficiary_contact IS NOT NULL)
  );
  
  -- Log for debugging (can be removed in production)
  -- RAISE NOTICE 'Found % cases for beneficiary % (name: %, contact: %)', v_case_count, p_beneficiary_id, v_beneficiary_record.name, v_beneficiary_record.mobile_number;
  
  IF v_case_count IS NULL OR v_case_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete beneficiary. This beneficiary is assigned to % case(s). Please remove the beneficiary from all cases before deleting.', COALESCE(v_case_count, 0)
      USING ERRCODE = 'P0002';
  END IF;
  
  -- 3. Delete all document records from database
  DELETE FROM beneficiary_documents
  WHERE beneficiary_documents.beneficiary_id = p_beneficiary_id;
  
  -- 4. Delete the beneficiary
  DELETE FROM beneficiaries
  WHERE beneficiaries.id = p_beneficiary_id;
  
  -- Return the deleted beneficiary data
  RETURN QUERY SELECT
    v_beneficiary_record.id,
    v_beneficiary_record.name,
    v_beneficiary_record.name_ar,
    v_beneficiary_record.created_at;
END;
$$;


ALTER FUNCTION public.delete_beneficiary_with_documents(p_beneficiary_id uuid) OWNER TO postgres;

--
-- Name: delete_case_cascaded(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_case_cascaded(case_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Check if case exists
  IF NOT EXISTS (SELECT 1 FROM cases WHERE id = case_id) THEN
    RAISE EXCEPTION 'Case not found';
  END IF;

  -- Check if case has contributions
  IF EXISTS (SELECT 1 FROM contributions WHERE case_id = case_id) THEN
    RAISE EXCEPTION 'Cannot delete case with existing contributions';
  END IF;

  -- Delete in order to respect foreign key constraints
  
  -- 1. Delete case updates (case_updates table)
  DELETE FROM case_updates WHERE case_id = case_id;
  
  -- 2. Delete case files (case_files table)
  DELETE FROM case_files WHERE case_id = case_id;
  
  -- 3. Delete case images (case_images_backup table if exists)
  DELETE FROM case_images_backup WHERE case_id = case_id;
  
  -- 4. Delete case contributions (should be empty due to check above)
  DELETE FROM contributions WHERE case_id = case_id;
  
  -- 5. Delete case notifications (if any)
  DELETE FROM notifications WHERE case_id = case_id;
  
  -- 6. Delete case comments (if any)
  DELETE FROM case_comments WHERE case_id = case_id;
  
  -- 7. Delete case likes/favorites (if any)
  DELETE FROM case_favorites WHERE case_id = case_id;
  
  -- 8. Delete case tags (if any)
  DELETE FROM case_tags WHERE case_id = case_id;
  
  -- 9. Delete case categories (if any)
  DELETE FROM case_categories WHERE case_id = case_id;
  
  -- 10. Finally, delete the case itself
  DELETE FROM cases WHERE id = case_id;
  
  -- Log the deletion
  INSERT INTO audit_logs (action, table_name, record_id, user_id, created_at)
  VALUES ('DELETE', 'cases', case_id, auth.uid(), NOW());
  
END;
$$;


ALTER FUNCTION public.delete_case_cascaded(case_id uuid) OWNER TO postgres;

--
-- Name: get_contribution_stats(uuid, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_contribution_stats(p_donor_id uuid DEFAULT NULL::uuid, p_is_admin boolean DEFAULT false) RETURNS TABLE(total bigint, pending bigint, approved bigint, rejected bigint, total_amount numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_statuses AS (
    SELECT DISTINCT ON (c.id)
      c.id,
      c.amount,
      COALESCE(cas.status, 'pending') as status
    FROM contributions c
    LEFT JOIN contribution_approval_status cas 
      ON c.id = cas.contribution_id
    WHERE 
      -- Filter by donor if not admin
      (p_is_admin OR c.donor_id = p_donor_id)
    ORDER BY c.id, cas.created_at DESC NULLS LAST
  )
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status IN ('rejected', 'revised')) as rejected,
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_amount
  FROM latest_statuses;
END;
$$;


ALTER FUNCTION public.get_contribution_stats(p_donor_id uuid, p_is_admin boolean) OWNER TO postgres;

--
-- Name: FUNCTION get_contribution_stats(p_donor_id uuid, p_is_admin boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_contribution_stats(p_donor_id uuid, p_is_admin boolean) IS 'Calculates contribution statistics (total, pending, approved, rejected, total_amount) 
efficiently in a single query. Supports filtering by donor_id for user-specific stats.
Parameters:
  - p_donor_id: Filter by specific donor (NULL for all)
  - p_is_admin: If true, shows all contributions regardless of donor_id';


--
-- Name: get_contributions_filtered(text, uuid, boolean, integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_contributions_filtered(p_status text DEFAULT 'all'::text, p_donor_id uuid DEFAULT NULL::uuid, p_is_admin boolean DEFAULT false, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text) RETURNS TABLE(id uuid, type text, donor_id uuid, case_id uuid, project_id uuid, project_cycle_id uuid, amount numeric, status text, notes text, anonymous boolean, payment_method text, proof_of_payment text, created_at timestamp with time zone, updated_at timestamp with time zone, approval_status text, rejection_reason text, admin_comment text, status_updated_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- First, get the total count for pagination
  WITH filtered_base AS (
    SELECT DISTINCT ON (c.id)
      c.id
    FROM contributions c
    LEFT JOIN contribution_approval_status cas 
      ON c.id = cas.contribution_id
    WHERE 
      -- Filter by donor if not admin
      (p_is_admin OR c.donor_id = p_donor_id)
      -- Filter by approval status
      AND (
        p_status = 'all' 
        OR (p_status = 'pending' AND COALESCE(cas.status, 'pending') = 'pending')
        OR (p_status = 'approved' AND COALESCE(cas.status, 'pending') = 'approved')
        OR (p_status = 'rejected' AND COALESCE(cas.status, 'pending') IN ('rejected', 'revised'))
      )
    ORDER BY c.id, cas.created_at DESC NULLS LAST
  )
  SELECT COUNT(*) INTO v_total_count FROM filtered_base;

  -- Return paginated results with total count
  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id,
    c.type,
    c.donor_id,
    c.case_id,
    c.project_id,
    c.project_cycle_id,
    c.amount,
    c.status,
    c.notes,
    c.anonymous,
    c.payment_method,
    c.proof_of_payment,
    c.created_at,
    c.updated_at,
    COALESCE(cas.status, 'pending') as approval_status,
    cas.rejection_reason,
    cas.admin_comment,
    cas.updated_at as status_updated_at,
    v_total_count as total_count
  FROM contributions c
  LEFT JOIN contribution_approval_status cas 
    ON c.id = cas.contribution_id
  WHERE 
    -- Filter by donor if not admin
    (p_is_admin OR c.donor_id = p_donor_id)
    -- Filter by approval status
    AND (
      p_status = 'all' 
      OR (p_status = 'pending' AND COALESCE(cas.status, 'pending') = 'pending')
      OR (p_status = 'approved' AND COALESCE(cas.status, 'pending') = 'approved')
      OR (p_status = 'rejected' AND COALESCE(cas.status, 'pending') IN ('rejected', 'revised'))
    )
  ORDER BY 
    c.id,
    cas.created_at DESC NULLS LAST,
    CASE 
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN c.created_at
    END DESC,
    CASE 
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN c.created_at
    END ASC,
    CASE 
      WHEN p_sort_by = 'amount' AND p_sort_order = 'desc' THEN c.amount
    END DESC,
    CASE 
      WHEN p_sort_by = 'amount' AND p_sort_order = 'asc' THEN c.amount
    END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) OWNER TO postgres;

--
-- Name: FUNCTION get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) IS 'Returns filtered and paginated contributions with their latest approval status.
Performs all filtering, sorting, and pagination in the database for optimal performance.
Parameters:
  - p_status: Filter by status (all/pending/approved/rejected)
  - p_donor_id: Filter by specific donor (NULL for all)
  - p_is_admin: If true, shows all contributions
  - p_limit: Number of results per page
  - p_offset: Pagination offset
  - p_sort_by: Sort column (created_at/amount)
  - p_sort_order: Sort direction (asc/desc)
Returns: Contributions with total_count for pagination';


--
-- Name: get_user_menu_items(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_menu_items(user_id uuid) RETURNS TABLE(id uuid, parent_id uuid, label character varying, label_ar character varying, href character varying, icon character varying, description text, sort_order integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH accessible_items AS (
        -- Get all menu items the user has direct permission for
        SELECT 
            mi.id,
            mi.parent_id,
            mi.label,
            mi.label_ar,
            mi.href,
            mi.icon,
            mi.description,
            mi.sort_order
        FROM admin_menu_items mi
        WHERE mi.is_active = true
        AND (
            mi.permission_id IS NULL -- Public menu items
            OR user_has_permission(user_id, (SELECT name FROM admin_permissions WHERE admin_permissions.id = mi.permission_id))
        )
    ),
    accessible_parents AS (
        -- Get all parent items that have accessible children
        SELECT DISTINCT
            p.id,
            p.parent_id,
            p.label,
            p.label_ar,
            p.href,
            p.icon,
            p.description,
            p.sort_order
        FROM admin_menu_items p
        INNER JOIN accessible_items c ON c.parent_id = p.id
        WHERE p.is_active = true
    ),
    all_accessible AS (
        -- Combine accessible items and their parents
        SELECT * FROM accessible_items
        UNION
        SELECT * FROM accessible_parents
    )
    SELECT 
        a.id,
        a.parent_id,
        a.label,
        a.label_ar,
        a.href,
        a.icon,
        a.description,
        a.sort_order
    FROM all_accessible a
    ORDER BY a.sort_order, a.label;
END;
$$;


ALTER FUNCTION public.get_user_menu_items(user_id uuid) OWNER TO postgres;

--
-- Name: get_user_notifications_sorted(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_notifications_sorted(user_id uuid) RETURNS TABLE(id uuid, type text, recipient_id uuid, title text, message text, data jsonb, read boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.recipient_id,
        n.title,
        n.message,
        n.data,
        n.read,
        n.created_at,
        n.updated_at
    FROM notifications n
    WHERE n.recipient_id = user_id
    ORDER BY 
        COALESCE(n.created_at, n.updated_at, NOW()) DESC,
        n.id DESC
    LIMIT 100;
END;
$$;


ALTER FUNCTION public.get_user_notifications_sorted(user_id uuid) OWNER TO postgres;

--
-- Name: get_user_permission_names(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_permission_names(user_id uuid) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT p.name
        FROM admin_user_roles ur
        JOIN admin_role_permissions rp ON ur.role_id = rp.role_id
        JOIN admin_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = get_user_permission_names.user_id
        AND ur.is_active = true
        AND p.is_active = true
    );
END;
$$;


ALTER FUNCTION public.get_user_permission_names(user_id uuid) OWNER TO postgres;

--
-- Name: handle_auth_user_updated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_auth_user_updated() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update public.users
     set email = new.email,
         updated_at = now()
   where id = new.id;
  return new;
end;
$$;


ALTER FUNCTION public.handle_auth_user_updated() OWNER TO postgres;

--
-- Name: is_admin_user(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin_user(check_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
      AND ur.is_active = true
      AND r.is_active = true
      AND r.name IN ('admin', 'super_admin')
    LIMIT 1
  );
$$;


ALTER FUNCTION public.is_admin_user(check_user_id uuid) OWNER TO postgres;

--
-- Name: is_current_user_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_current_user_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_user_roles ur
        JOIN admin_roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND r.is_active = true
        AND r.name IN ('admin', 'super_admin')
    );
END;
$$;


ALTER FUNCTION public.is_current_user_admin() OWNER TO postgres;

--
-- Name: rbac_audit_role_permissions_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rbac_audit_role_permissions_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    role_name VARCHAR(50);
    permission_name VARCHAR(100);
    action_type VARCHAR(50);
BEGIN
    -- Get role and permission names
    SELECT name INTO role_name FROM rbac_roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);
    SELECT name INTO permission_name FROM rbac_permissions WHERE id = COALESCE(NEW.permission_id, OLD.permission_id);
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'grant';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'revoke';
    END IF;
    
    -- Log the change
    PERFORM rbac_log_change(
        COALESCE(NEW.granted_by, OLD.granted_by),
        action_type,
        'rbac_role_permissions',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NULL,
        NULL,
        CASE WHEN action_type = 'revoke' THEN 'warning' ELSE 'info' END,
        'permission_change',
        jsonb_build_object(
            'role_name', role_name,
            'permission_name', permission_name
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.rbac_audit_role_permissions_trigger() OWNER TO postgres;

--
-- Name: rbac_audit_user_roles_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rbac_audit_user_roles_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    role_name VARCHAR(50);
    action_type VARCHAR(50);
BEGIN
    -- Get role name
    SELECT name INTO role_name FROM rbac_roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'assign';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'revoke';
    END IF;
    
    -- Log the change
    PERFORM rbac_log_change(
        COALESCE(NEW.assigned_by, OLD.assigned_by),
        action_type,
        'rbac_user_roles',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NULL,
        NULL,
        CASE WHEN action_type = 'revoke' THEN 'warning' ELSE 'info' END,
        'role_assignment',
        jsonb_build_object(
            'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
            'role_name', role_name
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.rbac_audit_user_roles_trigger() OWNER TO postgres;

--
-- Name: rbac_cleanup_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rbac_cleanup_audit_logs(p_retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rbac_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    PERFORM rbac_log_change(
        NULL,
        'cleanup',
        'rbac_audit_log',
        NULL,
        NULL,
        jsonb_build_object('retention_days', p_retention_days, 'deleted_count', deleted_count),
        NULL,
        NULL,
        'info',
        'maintenance',
        jsonb_build_object('retention_days', p_retention_days)
    );
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.rbac_cleanup_audit_logs(p_retention_days integer) OWNER TO postgres;

--
-- Name: rbac_log_change(uuid, character varying, character varying, uuid, jsonb, jsonb, character varying, character varying, character varying, character varying, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rbac_log_change(p_user_id uuid, p_action character varying, p_table_name character varying, p_record_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_session_id character varying DEFAULT NULL::character varying, p_request_id character varying DEFAULT NULL::character varying, p_severity character varying DEFAULT 'info'::character varying, p_category character varying DEFAULT 'rbac'::character varying, p_details jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO rbac_audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        session_id,
        request_id,
        severity,
        category,
        details,
        metadata,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values,
        p_session_id,
        p_request_id,
        p_severity,
        p_category,
        p_details,
        p_metadata,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION public.rbac_log_change(p_user_id uuid, p_action character varying, p_table_name character varying, p_record_id uuid, p_old_values jsonb, p_new_values jsonb, p_session_id character varying, p_request_id character varying, p_severity character varying, p_category character varying, p_details jsonb, p_metadata jsonb) OWNER TO postgres;

--
-- Name: rbac_log_permission_change(uuid, character varying, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rbac_log_permission_change(p_user_id uuid, p_role_name character varying, p_permission_name character varying, p_action character varying, p_session_id character varying DEFAULT NULL::character varying, p_request_id character varying DEFAULT NULL::character varying) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    log_id UUID;
    role_id UUID;
    permission_id UUID;
BEGIN
    -- Get role and permission IDs
    SELECT id INTO role_id FROM rbac_roles WHERE name = p_role_name;
    SELECT id INTO permission_id FROM rbac_permissions WHERE name = p_permission_name;
    
    -- Log the change
    SELECT rbac_log_change(
        p_user_id,
        p_action,
        'rbac_role_permissions',
        role_id,
        NULL,
        jsonb_build_object(
            'role_name', p_role_name,
            'permission_name', p_permission_name,
            'action', p_action
        ),
        p_session_id,
        p_request_id,
        CASE WHEN p_action = 'grant' THEN 'info' ELSE 'warning' END,
        'permission_change',
        jsonb_build_object(
            'role_name', p_role_name,
            'permission_name', p_permission_name
        )
    ) INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION public.rbac_log_permission_change(p_user_id uuid, p_role_name character varying, p_permission_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) OWNER TO postgres;

--
-- Name: rbac_log_role_assignment(uuid, uuid, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rbac_log_role_assignment(p_user_id uuid, p_target_user_id uuid, p_role_name character varying, p_action character varying, p_session_id character varying DEFAULT NULL::character varying, p_request_id character varying DEFAULT NULL::character varying) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    log_id UUID;
    role_id UUID;
BEGIN
    -- Get role ID
    SELECT id INTO role_id FROM rbac_roles WHERE name = p_role_name;
    
    -- Log the change
    SELECT rbac_log_change(
        p_user_id,
        p_action,
        'rbac_user_roles',
        role_id,
        NULL,
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'role_name', p_role_name,
            'action', p_action
        ),
        p_session_id,
        p_request_id,
        CASE WHEN p_action = 'assign' THEN 'info' ELSE 'warning' END,
        'role_assignment',
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'role_name', p_role_name
        )
    ) INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION public.rbac_log_role_assignment(p_user_id uuid, p_target_user_id uuid, p_role_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) OWNER TO postgres;

--
-- Name: search_contributions(uuid, boolean, text, text, timestamp with time zone, timestamp with time zone, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_contributions(p_user_id uuid DEFAULT NULL::uuid, p_is_admin boolean DEFAULT false, p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, type text, amount numeric, payment_method text, status text, proof_of_payment text, anonymous boolean, donor_id uuid, case_id uuid, notes text, message text, proof_url text, created_at timestamp with time zone, updated_at timestamp with time zone, case_title text, donor_email text, donor_first_name text, donor_last_name text, donor_phone text, approval_status text, approval_rejection_reason text, approval_admin_comment text, approval_donor_reply text, approval_resubmission_count integer, approval_created_at timestamp with time zone, approval_updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.type,
        c.amount,
        c.payment_method_id::TEXT as payment_method,
        c.status,
        c.proof_of_payment,
        c.anonymous,
        c.donor_id,
        c.case_id,
        c.notes,
        c.message,
        c.proof_url,
        c.created_at,
        c.updated_at,
        -- Joined case data - use COALESCE to return title_en or title_ar
        COALESCE(cs.title_en, cs.title_ar) as case_title,
        -- Joined user data
        u.email as donor_email,
        u.first_name as donor_first_name,
        u.last_name as donor_last_name,
        u.phone as donor_phone,
        -- Approval status (get the latest one)
        cas.status as approval_status,
        cas.rejection_reason as approval_rejection_reason,
        cas.admin_comment as approval_admin_comment,
        cas.donor_reply as approval_donor_reply,
        cas.resubmission_count as approval_resubmission_count,
        cas.created_at as approval_created_at,
        cas.updated_at as approval_updated_at
    FROM contributions c
    LEFT JOIN cases cs ON c.case_id = cs.id
    LEFT JOIN users u ON c.donor_id = u.id
    LEFT JOIN LATERAL (
        SELECT *
        FROM contribution_approval_status
        WHERE contribution_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) cas ON true
    WHERE 
        -- User filtering (if not admin, only show their own contributions)
        (p_is_admin OR c.donor_id = p_user_id)
        -- Status filtering
        AND (
            p_status IS NULL 
            OR p_status = 'all'
            OR (
                CASE p_status
                    WHEN 'approved' THEN cas.status = 'approved'
                    WHEN 'rejected' THEN cas.status IN ('rejected', 'revised')
                    WHEN 'pending' THEN (cas.status IS NULL OR cas.status = 'pending')
                    ELSE true
                END
            )
        )
        -- Date range filtering
        AND (p_date_from IS NULL OR c.created_at >= p_date_from)
        AND (p_date_to IS NULL OR c.created_at <= p_date_to)
        -- Search filtering (across case title, donor name, donor email)
        -- Search both title_en and title_ar for bilingual support
        AND (
            p_search IS NULL 
            OR p_search = ''
            OR (
                cs.title_en ILIKE '%' || p_search || '%'
                OR cs.title_ar ILIKE '%' || p_search || '%'
                OR u.email ILIKE '%' || p_search || '%'
                OR u.first_name ILIKE '%' || p_search || '%'
                OR u.last_name ILIKE '%' || p_search || '%'
                OR CONCAT(u.first_name, ' ', u.last_name) ILIKE '%' || p_search || '%'
            )
        )
    ORDER BY
        CASE WHEN p_sort_order = 'asc' THEN
            CASE p_sort_by
                WHEN 'amount' THEN c.amount
                WHEN 'created_at' THEN c.created_at
                WHEN 'case_title' THEN COALESCE(cs.title_en, cs.title_ar)
                ELSE c.created_at
            END
        END ASC,
        CASE WHEN p_sort_order != 'asc' THEN
            CASE p_sort_by
                WHEN 'amount' THEN c.amount
                WHEN 'created_at' THEN c.created_at
                WHEN 'case_title' THEN COALESCE(cs.title_en, cs.title_ar)
                ELSE c.created_at
            END
        END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) OWNER TO postgres;

--
-- Name: FUNCTION search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) IS 'Efficiently search and filter contributions with joined case and user data. Supports search across case titles (title_en and title_ar) and donor information.';


--
-- Name: sync_email_verified(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_email_verified() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update email_verified in users table when email_confirmed_at changes
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    -- Use INSERT ... ON CONFLICT to ensure row exists
    -- This handles the case where the users table row wasn't created during signup
    INSERT INTO users (id, email, email_verified, role, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.email, NEW.id::text || '@placeholder.local'), 
      true, 
      'donor', 
      COALESCE(NEW.created_at, NOW()), 
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email_verified = true,
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW();
  ELSIF NEW.email_confirmed_at IS NULL AND OLD.email_confirmed_at IS NOT NULL THEN
    -- If email_confirmed_at is removed (shouldn't happen, but handle it)
    UPDATE users
    SET email_verified = false,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the trigger
  -- This ensures email verification doesn't fail due to users table issues
  RAISE WARNING 'Error in sync_email_verified for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_email_verified() OWNER TO postgres;

--
-- Name: FUNCTION sync_email_verified(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.sync_email_verified() IS 'Syncs email_verified in users table when email_confirmed_at changes in auth.users. Now handles missing users table rows gracefully.';


--
-- Name: sync_email_verified_on_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_email_verified_on_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Use INSERT ... ON CONFLICT to ensure row exists
    INSERT INTO users (id, email, email_verified, role, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.email, NEW.id::text || '@placeholder.local'), 
      true, 
      'donor', 
      COALESCE(NEW.created_at, NOW()), 
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email_verified = true,
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the trigger
  RAISE WARNING 'Error in sync_email_verified_on_insert for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_email_verified_on_insert() OWNER TO postgres;

--
-- Name: FUNCTION sync_email_verified_on_insert(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.sync_email_verified_on_insert() IS 'Syncs email_verified in users table when a new user is inserted with email_confirmed_at already set. Now handles missing users table rows gracefully.';


--
-- Name: update_ai_rules_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ai_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_ai_rules_updated_at() OWNER TO postgres;

--
-- Name: update_beneficiaries_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_beneficiaries_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_beneficiaries_updated_at() OWNER TO postgres;

--
-- Name: update_beneficiary_case_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_beneficiary_case_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- When a new case is linked to a beneficiary
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.beneficiary_id IS NOT NULL THEN
    UPDATE beneficiaries
    SET 
      total_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = NEW.beneficiary_id
      ),
      active_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = NEW.beneficiary_id 
        AND status IN ('active', 'pending', 'published')
      )
    WHERE id = NEW.beneficiary_id;
  END IF;
  
  -- When a case is unlinked from a beneficiary
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.beneficiary_id IS NOT NULL THEN
    UPDATE beneficiaries
    SET 
      total_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = OLD.beneficiary_id
      ),
      active_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = OLD.beneficiary_id 
        AND status IN ('active', 'pending', 'published')
      )
    WHERE id = OLD.beneficiary_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_beneficiary_case_counts() OWNER TO postgres;

--
-- Name: update_case_files_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_case_files_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_case_files_updated_at() OWNER TO postgres;

--
-- Name: update_fcm_tokens_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_fcm_tokens_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_fcm_tokens_updated_at() OWNER TO postgres;

--
-- Name: update_push_subscriptions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_push_subscriptions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_push_subscriptions_updated_at() OWNER TO postgres;

--
-- Name: update_storage_rules_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_storage_rules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_storage_rules_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: user_has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_has_permission(user_id uuid, permission_name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM admin_user_roles ur
        JOIN admin_role_permissions rp ON ur.role_id = rp.role_id
        JOIN admin_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_has_permission.user_id
        AND ur.is_active = true
        AND p.name = permission_name
        AND p.is_active = true
    );
END;
$$;


ALTER FUNCTION public.user_has_permission(user_id uuid, permission_name text) OWNER TO postgres;

--
-- Name: user_has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_has_role(user_id uuid, role_name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM admin_user_roles ur
        JOIN admin_roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_has_role.user_id
        AND ur.is_active = true
        AND r.name = role_name
        AND r.is_active = true
    );
END;
$$;


ALTER FUNCTION public.user_has_role(user_id uuid, role_name text) OWNER TO postgres;

--
-- Name: verify_user_merge_readiness(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_user_merge_readiness(source_user_id uuid, target_user_id uuid) RETURNS TABLE(table_name text, column_name text, record_count bigint, can_merge boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'contributions'::TEXT,
    'donor_id'::TEXT,
    (SELECT COUNT(*) FROM contributions WHERE donor_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'notifications'::TEXT,
    'recipient_id'::TEXT,
    (SELECT COUNT(*) FROM notifications WHERE recipient_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'recurring_contributions'::TEXT,
    'donor_id'::TEXT,
    (SELECT COUNT(*) FROM recurring_contributions WHERE donor_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'sponsorships'::TEXT,
    'sponsor_id'::TEXT,
    (SELECT COUNT(*) FROM sponsorships WHERE sponsor_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'communications'::TEXT,
    'sender_id, recipient_id'::TEXT,
    (SELECT COUNT(*) FROM communications WHERE sender_id = source_user_id OR recipient_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'cases'::TEXT,
    'created_by, assigned_to, sponsored_by'::TEXT,
    (SELECT COUNT(*) FROM cases WHERE created_by = source_user_id OR assigned_to = source_user_id OR sponsored_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'case_status_history'::TEXT,
    'changed_by'::TEXT,
    (SELECT COUNT(*) FROM case_status_history WHERE changed_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'case_updates'::TEXT,
    'created_by'::TEXT,
    (SELECT COUNT(*) FROM case_updates WHERE created_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'projects'::TEXT,
    'created_by, assigned_to'::TEXT,
    (SELECT COUNT(*) FROM projects WHERE created_by = source_user_id OR assigned_to = source_user_id),
    true
  UNION ALL
  SELECT 
    'contribution_approval_status'::TEXT,
    'admin_id'::TEXT,
    (SELECT COUNT(*) FROM contribution_approval_status WHERE admin_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'category_detection_rules'::TEXT,
    'created_by, updated_by'::TEXT,
    (SELECT COUNT(*) FROM category_detection_rules WHERE created_by = source_user_id OR updated_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'landing_stats'::TEXT,
    'updated_by'::TEXT,
    (SELECT COUNT(*) FROM landing_stats WHERE updated_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'system_config'::TEXT,
    'updated_by'::TEXT,
    (SELECT COUNT(*) FROM system_config WHERE updated_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'system_content'::TEXT,
    'updated_by'::TEXT,
    (SELECT COUNT(*) FROM system_content WHERE updated_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'site_activity_log'::TEXT,
    'user_id'::TEXT,
    (SELECT COUNT(*) FROM site_activity_log WHERE user_id = source_user_id),
    true
  UNION ALL
  SELECT 
    'beneficiaries'::TEXT,
    'created_by'::TEXT,
    (SELECT COUNT(*) FROM beneficiaries WHERE created_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'beneficiary_documents'::TEXT,
    'uploaded_by'::TEXT,
    (SELECT COUNT(*) FROM beneficiary_documents WHERE uploaded_by = source_user_id),
    true
  UNION ALL
  SELECT 
    'rbac_audit_log'::TEXT,
    'user_id'::TEXT,
    (SELECT COUNT(*) FROM rbac_audit_log WHERE user_id = source_user_id),
    true;
END;
$$;


ALTER FUNCTION public.verify_user_merge_readiness(source_user_id uuid, target_user_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION verify_user_merge_readiness(source_user_id uuid, target_user_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.verify_user_merge_readiness(source_user_id uuid, target_user_id uuid) IS 'Verifies readiness for user merge by counting records that reference the source user';


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: admin_menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    label character varying(100) NOT NULL,
    label_ar character varying(100),
    href character varying(255) NOT NULL,
    icon character varying(50),
    description text,
    description_ar text,
    sort_order integer DEFAULT 0,
    permission_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_public_nav boolean DEFAULT false,
    nav_metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.admin_menu_items OWNER TO postgres;

--
-- Name: COLUMN admin_menu_items.is_public_nav; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.admin_menu_items.is_public_nav IS 'If true, this item appears in the public navigation bar for unauthenticated users';


--
-- Name: COLUMN admin_menu_items.nav_metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.admin_menu_items.nav_metadata IS 'JSONB object storing navigation-specific properties: isHashLink, showOnLanding, showOnOtherPages';


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    display_name_ar character varying(200),
    description text,
    description_ar text,
    resource character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_permissions OWNER TO postgres;

--
-- Name: admin_role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_role_permissions OWNER TO postgres;

--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    display_name_ar character varying(100),
    description text,
    description_ar text,
    level integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_roles OWNER TO postgres;

--
-- Name: admin_user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true
);


ALTER TABLE public.admin_user_roles OWNER TO postgres;

--
-- Name: ai_rule_parameters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_rule_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_key text NOT NULL,
    parameter_key text NOT NULL,
    parameter_value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_rule_parameters OWNER TO postgres;

--
-- Name: TABLE ai_rule_parameters; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_rule_parameters IS 'Parameters for AI rules. Used for lightweight variable substitution in rule instructions (e.g., {{max_amount}}, {{location}}).';


--
-- Name: COLUMN ai_rule_parameters.parameter_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rule_parameters.parameter_key IS 'Parameter key (e.g., "max_amount", "location")';


--
-- Name: COLUMN ai_rule_parameters.parameter_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rule_parameters.parameter_value IS 'Parameter value for substitution';


--
-- Name: ai_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_key text NOT NULL,
    instruction text NOT NULL,
    scope text DEFAULT 'global'::text NOT NULL,
    scope_reference text,
    priority integer DEFAULT 100 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    lang text,
    group_id uuid,
    CONSTRAINT ai_rules_priority_check CHECK (((priority >= 1) AND (priority <= 1000))),
    CONSTRAINT ai_rules_scope_check CHECK ((scope = ANY (ARRAY['global'::text, 'module'::text, 'feature'::text, 'tenant'::text, 'user'::text, 'role'::text, 'case'::text])))
);


ALTER TABLE public.ai_rules OWNER TO postgres;

--
-- Name: TABLE ai_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_rules IS 'Core AI rules table. Rules are small, human-written instructions that are combined at runtime into AI system prompts. Rules are ordered by priority and filtered by scope.';


--
-- Name: COLUMN ai_rules.rule_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.rule_key IS 'Stable logical identifier for the rule (e.g., "title.max_length", "content.location_restriction")';


--
-- Name: COLUMN ai_rules.instruction; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.instruction IS 'Plain-text instruction for the AI. This is what gets added to the system prompt.';


--
-- Name: COLUMN ai_rules.scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.scope IS 'Scope of the rule: global, module, feature, tenant, user, or role';


--
-- Name: COLUMN ai_rules.scope_reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.scope_reference IS 'Optional reference for scoped rules (module name, feature name, tenant_id, user_id, role_id)';


--
-- Name: COLUMN ai_rules.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.priority IS 'Priority for ordering rules (1-1000, lower = higher priority)';


--
-- Name: COLUMN ai_rules.version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.version IS 'Version number for tracking changes to rules';


--
-- Name: COLUMN ai_rules.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.is_active IS 'Whether the rule is currently active/enabled';


--
-- Name: COLUMN ai_rules.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.metadata IS 'Optional JSON metadata (e.g., language, category, tags)';


--
-- Name: COLUMN ai_rules.lang; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.lang IS 'Comma-separated language codes (e.g., "EN,AR" or "en,ar"). NULL means applies to all languages.';


--
-- Name: COLUMN ai_rules.group_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ai_rules.group_id IS 'Groups related rules together (e.g., AR and EN versions of the same rule). NULL for rules without a group.';


--
-- Name: CONSTRAINT ai_rules_scope_check ON ai_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT ai_rules_scope_check ON public.ai_rules IS 'Ensures scope is one of the valid values: global, module, feature, tenant, user, role, or case';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action character varying(50) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid NOT NULL,
    user_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: batch_upload_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch_upload_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    row_number integer NOT NULL,
    case_number text NOT NULL,
    case_title text NOT NULL,
    contributor_nickname text NOT NULL,
    amount numeric(10,2) NOT NULL,
    month text NOT NULL,
    user_id uuid,
    case_id uuid,
    contribution_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    mapping_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.batch_upload_items OWNER TO postgres;

--
-- Name: TABLE batch_upload_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.batch_upload_items IS 'Individual items (cases/contributions) in a batch upload';


--
-- Name: COLUMN batch_upload_items.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.batch_upload_items.status IS 'pending, mapped, case_created, contribution_created, failed';


--
-- Name: batch_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    source_file text,
    status text DEFAULT 'pending'::text NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    processed_items integer DEFAULT 0 NOT NULL,
    successful_items integer DEFAULT 0 NOT NULL,
    failed_items integer DEFAULT 0 NOT NULL,
    error_summary jsonb,
    metadata jsonb,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.batch_uploads OWNER TO postgres;

--
-- Name: TABLE batch_uploads; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.batch_uploads IS 'Tracks batch upload sessions for cases and contributions';


--
-- Name: COLUMN batch_uploads.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.batch_uploads.status IS 'pending, processing, completed, failed, cancelled';


--
-- Name: beneficiaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beneficiaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_ar text,
    age integer,
    gender text,
    mobile_number text,
    email text,
    alternative_contact text,
    national_id text,
    id_type text DEFAULT 'national_id'::text,
    address text,
    city text,
    governorate text,
    country text DEFAULT 'Egypt'::text,
    medical_condition text,
    social_situation text,
    family_size integer,
    dependents integer,
    is_verified boolean DEFAULT false,
    verification_date timestamp with time zone,
    verification_notes text,
    notes text,
    tags text[],
    risk_level text DEFAULT 'low'::text,
    total_cases integer DEFAULT 0,
    active_cases integer DEFAULT 0,
    total_amount_received numeric(15,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    year_of_birth integer,
    additional_mobile_number character varying(20),
    id_type_id uuid,
    city_id uuid,
    CONSTRAINT at_least_one_identifier CHECK (((mobile_number IS NOT NULL) OR (national_id IS NOT NULL))),
    CONSTRAINT beneficiaries_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT beneficiaries_id_type_check CHECK ((id_type = ANY (ARRAY['national_id'::text, 'passport'::text, 'other'::text]))),
    CONSTRAINT beneficiaries_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


ALTER TABLE public.beneficiaries OWNER TO postgres;

--
-- Name: COLUMN beneficiaries.year_of_birth; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.beneficiaries.year_of_birth IS 'Year of birth (calculated from age input)';


--
-- Name: beneficiary_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.beneficiary_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    beneficiary_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    mime_type character varying(100),
    is_public boolean DEFAULT false,
    description text,
    uploaded_at timestamp with time zone DEFAULT now(),
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.beneficiary_documents OWNER TO postgres;

--
-- Name: TABLE beneficiary_documents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.beneficiary_documents IS 'Documents attached to beneficiary profiles';


--
-- Name: COLUMN beneficiary_documents.is_public; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.beneficiary_documents.is_public IS 'Whether document is visible to all users or only contributors';


--
-- Name: case_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description_en text,
    description_ar text
);


ALTER TABLE public.case_categories OWNER TO postgres;

--
-- Name: case_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    filename text NOT NULL,
    original_filename text,
    file_url text NOT NULL,
    file_path text,
    file_type text NOT NULL,
    file_size bigint DEFAULT 0,
    category text DEFAULT 'other'::text,
    description text,
    is_public boolean DEFAULT false,
    is_primary boolean DEFAULT false,
    display_order integer DEFAULT 0,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.case_files OWNER TO postgres;

--
-- Name: TABLE case_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.case_files IS 'Unified storage for all case files (images, documents, videos, etc.)';


--
-- Name: COLUMN case_files.filename; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.filename IS 'Display name for the file (user can edit this)';


--
-- Name: COLUMN case_files.original_filename; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.original_filename IS 'Original filename when uploaded';


--
-- Name: COLUMN case_files.file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.file_url IS 'Full URL to access the file in storage';


--
-- Name: COLUMN case_files.file_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.file_path IS 'Storage path (relative to bucket)';


--
-- Name: COLUMN case_files.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.category IS 'File category: photos, medical, financial, identity, videos, audio, other';


--
-- Name: COLUMN case_files.is_primary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.is_primary IS 'Whether this is the primary/featured image for the case';


--
-- Name: COLUMN case_files.display_order; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.case_files.display_order IS 'Order in which files should be displayed (0-indexed)';


--
-- Name: case_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    previous_status text,
    new_status text NOT NULL,
    changed_by uuid,
    system_triggered boolean DEFAULT false NOT NULL,
    change_reason text,
    changed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.case_status_history OWNER TO postgres;

--
-- Name: case_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    update_type text DEFAULT 'general'::text NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    attachments text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.case_updates OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title_en text NOT NULL,
    description_ar text NOT NULL,
    type text DEFAULT 'one-time'::text NOT NULL,
    category_id uuid,
    priority text NOT NULL,
    location text,
    beneficiary_name text,
    beneficiary_contact text,
    target_amount numeric(10,2) NOT NULL,
    current_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    frequency text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    duration integer,
    created_by uuid NOT NULL,
    assigned_to uuid,
    sponsored_by uuid,
    supporting_documents text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    beneficiary_id uuid,
    title_ar text,
    description_en text,
    batch_id uuid
);


ALTER TABLE public.cases OWNER TO postgres;

--
-- Name: COLUMN cases.title_en; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases.title_en IS 'Case title in English';


--
-- Name: COLUMN cases.description_ar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases.description_ar IS 'Case description in Arabic';


--
-- Name: COLUMN cases.title_ar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases.title_ar IS 'Case title in Arabic';


--
-- Name: COLUMN cases.description_en; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases.description_en IS 'Case description in English';


--
-- Name: COLUMN cases.batch_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cases.batch_id IS 'Reference to batch_uploads if this case was created from a batch upload';


--
-- Name: category_detection_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category_detection_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    keyword character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    category_id uuid NOT NULL
);


ALTER TABLE public.category_detection_rules OWNER TO postgres;

--
-- Name: category_summary_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.category_summary_view AS
 SELECT cc.id AS category_id,
    COALESCE(cc.name_en, cc.name) AS name_en,
    COALESCE(cc.name_ar, cc.name) AS name_ar,
    COALESCE(cc.description_en, cc.description) AS description_en,
    COALESCE(cc.description_ar, cc.description) AS description_ar,
    cc.icon,
    cc.color,
    count(DISTINCT c.id) AS total_cases,
    COALESCE(sum((c.current_amount)::numeric), (0)::numeric) AS total_amount,
        CASE
            WHEN (count(DISTINCT c.id) > 0) THEN (COALESCE(sum((c.current_amount)::numeric), (0)::numeric) / (count(DISTINCT c.id))::numeric)
            ELSE (0)::numeric
        END AS average_per_case
   FROM (public.case_categories cc
     LEFT JOIN public.cases c ON (((c.category_id = cc.id) AND (c.status = 'published'::text))))
  WHERE (cc.is_active = true)
  GROUP BY cc.id, cc.name_en, cc.name_ar, cc.name, cc.description_en, cc.description_ar, cc.description, cc.icon, cc.color
  ORDER BY COALESCE(sum((c.current_amount)::numeric), (0)::numeric) DESC;


ALTER VIEW public.category_summary_view OWNER TO postgres;

--
-- Name: VIEW category_summary_view; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.category_summary_view IS 'Aggregated category statistics for landing page - shows total cases, total amount, and average per case for each active category';


--
-- Name: cities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name_en character varying(100) NOT NULL,
    name_ar character varying(100) NOT NULL,
    governorate character varying(100),
    country character varying(100) DEFAULT 'Egypt'::character varying,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cities OWNER TO postgres;

--
-- Name: TABLE cities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.cities IS 'Lookup table for cities in Egypt';


--
-- Name: communications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.communications OWNER TO postgres;

--
-- Name: contribution_approval_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contribution_approval_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contribution_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_id uuid,
    rejection_reason text,
    admin_comment text,
    donor_reply text,
    donor_reply_date timestamp without time zone,
    payment_proof_url text,
    resubmission_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contribution_approval_status OWNER TO postgres;

--
-- Name: contributions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    proof_of_payment text,
    donor_id uuid NOT NULL,
    case_id uuid,
    project_id uuid,
    project_cycle_id uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    anonymous boolean DEFAULT false NOT NULL,
    payment_method_id uuid NOT NULL,
    payment_method_backup text,
    batch_id uuid
);


ALTER TABLE public.contributions OWNER TO postgres;

--
-- Name: COLUMN contributions.batch_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contributions.batch_id IS 'Reference to batch_uploads if this contribution was created from a batch upload';


--
-- Name: contribution_latest_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.contribution_latest_status AS
 SELECT DISTINCT ON (c.id) c.id AS contribution_id,
    c.donor_id,
    c.case_id,
    c.amount,
    c.status AS contribution_status,
    c.created_at,
    c.updated_at,
    COALESCE(cas.status, 'pending'::text) AS approval_status,
    cas.rejection_reason,
    cas.admin_comment,
    cas.updated_at AS status_updated_at
   FROM (public.contributions c
     LEFT JOIN public.contribution_approval_status cas ON ((c.id = cas.contribution_id)))
  ORDER BY c.id, cas.created_at DESC NULLS LAST;


ALTER VIEW public.contribution_latest_status OWNER TO postgres;

--
-- Name: VIEW contribution_latest_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.contribution_latest_status IS 'Materialized view that provides the latest approval status for each contribution. 
Used to optimize filtering and stats queries.';


--
-- Name: fcm_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fcm_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    fcm_token text NOT NULL,
    device_id text,
    platform text,
    user_agent text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fcm_tokens OWNER TO postgres;

--
-- Name: id_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.id_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name_en character varying(100) NOT NULL,
    name_ar character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.id_types OWNER TO postgres;

--
-- Name: TABLE id_types; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.id_types IS 'Lookup table for identification document types';


--
-- Name: landing_contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landing_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT message_length CHECK (((char_length(message) >= 10) AND (char_length(message) <= 5000))),
    CONSTRAINT valid_email_format CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


ALTER TABLE public.landing_contacts OWNER TO postgres;

--
-- Name: landing_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landing_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stat_key text NOT NULL,
    stat_value bigint DEFAULT 0 NOT NULL,
    display_format text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.landing_stats OWNER TO postgres;

--
-- Name: TABLE landing_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.landing_stats IS 'Stores landing page statistics including success story numbers that can be manually or automatically updated';


--
-- Name: localization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.localization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    language text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.localization OWNER TO postgres;

--
-- Name: monthly_breakdown_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.monthly_breakdown_view WITH (security_invoker='on') AS
 WITH monthly_contributions AS (
         SELECT (EXTRACT(month FROM c.created_at))::integer AS month,
            (EXTRACT(year FROM c.created_at))::integer AS year,
            c.case_id,
            c.amount,
            c.donor_id
           FROM public.contributions c
          WHERE (c.status = 'approved'::text)
        ), monthly_stats AS (
         SELECT mc.month,
            mc.year,
            count(DISTINCT mc.case_id) AS total_cases,
            sum(mc.amount) AS total_amount,
            count(DISTINCT mc.donor_id) AS contributors
           FROM monthly_contributions mc
          GROUP BY mc.month, mc.year
        ), category_monthly AS (
         SELECT mc.month,
            mc.year,
            COALESCE(cc.name_en, cc.name) AS category_name_en,
            COALESCE(cc.name_ar, cc.name) AS category_name_ar,
            cc.id AS category_id,
            sum(mc.amount) AS category_amount,
            count(DISTINCT mc.case_id) AS category_cases
           FROM ((monthly_contributions mc
             JOIN public.cases cs ON (((cs.id = mc.case_id) AND (cs.status = 'published'::text))))
             LEFT JOIN public.case_categories cc ON ((cc.id = cs.category_id)))
          GROUP BY mc.month, mc.year, cc.id, cc.name_en, cc.name_ar, cc.name
        ), top_categories AS (
         SELECT cm.month,
            cm.year,
            cm.category_name_en,
            cm.category_name_ar,
            cm.category_id,
            cm.category_amount,
            cm.category_cases,
            row_number() OVER (PARTITION BY cm.month, cm.year ORDER BY cm.category_amount DESC) AS rank
           FROM category_monthly cm
        )
 SELECT ms.month,
    ms.year,
    ms.total_cases,
    ms.total_amount,
    ms.contributors,
    tc.category_name_en AS top_category_name_en,
    tc.category_name_ar AS top_category_name_ar,
    tc.category_id AS top_category_id,
    COALESCE(tc.category_amount, (0)::numeric) AS top_category_amount,
    COALESCE(tc.category_cases, (0)::bigint) AS top_category_cases
   FROM (monthly_stats ms
     LEFT JOIN top_categories tc ON (((tc.month = ms.month) AND (tc.year = ms.year) AND (tc.rank = 1))))
  ORDER BY ms.year DESC, ms.month DESC;


ALTER VIEW public.monthly_breakdown_view OWNER TO postgres;

--
-- Name: VIEW monthly_breakdown_view; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.monthly_breakdown_view IS 'Aggregated monthly statistics for landing page - shows total cases, total amount, contributors, and top category for each month';


--
-- Name: nickname_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nickname_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nickname text NOT NULL,
    user_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.nickname_mappings OWNER TO postgres;

--
-- Name: TABLE nickname_mappings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.nickname_mappings IS 'Maps contributor nicknames to user accounts for auto-mapping';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    recipient_id uuid NOT NULL,
    title text,
    message text,
    data jsonb,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    title_en text,
    title_ar text,
    message_en text,
    message_ar text
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.notifications IS 'Notifications table with bilingual support. Use title_en/title_ar and message_en/message_ar for new notifications. Legacy title/message fields are kept for backward compatibility.';


--
-- Name: COLUMN notifications.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.title IS 'Legacy title field (kept for backward compatibility)';


--
-- Name: COLUMN notifications.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.message IS 'Legacy message field (kept for backward compatibility)';


--
-- Name: COLUMN notifications.title_en; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.title_en IS 'Notification title in English';


--
-- Name: COLUMN notifications.title_ar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.title_ar IS 'Notification title in Arabic';


--
-- Name: COLUMN notifications.message_en; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.message_en IS 'Notification message in English';


--
-- Name: COLUMN notifications.message_ar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.message_ar IS 'Notification message in Arabic';


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    name_en text,
    name_ar text,
    description_en text,
    description_ar text,
    icon text
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: project_cycles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    cycle_number integer NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    target_amount numeric(10,2) NOT NULL,
    current_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    progress_percentage numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_cycles OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    target_amount numeric(10,2) NOT NULL,
    current_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    cycle_duration text NOT NULL,
    cycle_duration_days integer,
    total_cycles integer,
    current_cycle_number integer DEFAULT 1 NOT NULL,
    next_cycle_date timestamp without time zone,
    last_cycle_date timestamp without time zone,
    auto_progress boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    supporting_documents text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO postgres;

--
-- Name: recurring_contributions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_id uuid NOT NULL,
    case_id uuid,
    project_id uuid,
    amount numeric(10,2) NOT NULL,
    frequency text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    next_contribution_date timestamp without time zone NOT NULL,
    total_contributions integer DEFAULT 0 NOT NULL,
    successful_contributions integer DEFAULT 0 NOT NULL,
    failed_contributions integer DEFAULT 0 NOT NULL,
    payment_method text NOT NULL,
    auto_process boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.recurring_contributions OWNER TO postgres;

--
-- Name: site_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    activity_type character varying(50) NOT NULL,
    category character varying(50),
    action character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id uuid,
    resource_path character varying(500),
    method character varying(10),
    status_code integer,
    ip_address inet,
    user_agent text,
    referer character varying(500),
    details jsonb,
    metadata jsonb,
    severity character varying(20) DEFAULT 'info'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.site_activity_log OWNER TO postgres;

--
-- Name: TABLE site_activity_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.site_activity_log IS 'Comprehensive activity logging for all site activities including page views, API calls, user actions, and system events. Supports both authenticated users and anonymous visitors.';


--
-- Name: COLUMN site_activity_log.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.site_activity_log.user_id IS 'User ID for authenticated users, NULL for anonymous visitors';


--
-- Name: COLUMN site_activity_log.session_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.site_activity_log.session_id IS 'Session identifier for tracking visitor sessions and user sessions';


--
-- Name: COLUMN site_activity_log.activity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.site_activity_log.activity_type IS 'Type of activity: page_view, api_call, user_action, data_change, auth_event, system_event, error';


--
-- Name: COLUMN site_activity_log.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.site_activity_log.category IS 'Category for grouping: navigation, authentication, data, admin, system, security';


--
-- Name: COLUMN site_activity_log.severity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.site_activity_log.severity IS 'Severity level: info, warning, error, critical';


--
-- Name: site_activity_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.site_activity_summary AS
 SELECT date_trunc('day'::text, created_at) AS date,
    activity_type,
    category,
    action,
    count(*) AS count,
    count(DISTINCT user_id) FILTER (WHERE (user_id IS NOT NULL)) AS unique_users,
    count(DISTINCT session_id) AS unique_sessions,
    count(DISTINCT session_id) FILTER (WHERE (user_id IS NULL)) AS unique_visitor_sessions,
    count(*) FILTER (WHERE (user_id IS NULL)) AS visitor_activities,
    count(*) FILTER (WHERE (user_id IS NOT NULL)) AS authenticated_activities
   FROM public.site_activity_log
  GROUP BY (date_trunc('day'::text, created_at)), activity_type, category, action;


ALTER VIEW public.site_activity_summary OWNER TO postgres;

--
-- Name: sponsorships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sponsorships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    case_id uuid,
    project_id uuid,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    terms text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sponsorships OWNER TO postgres;

--
-- Name: storage_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_name text NOT NULL,
    max_file_size_mb integer DEFAULT 5 NOT NULL,
    allowed_extensions text[] DEFAULT ARRAY['pdf'::text, 'jpg'::text, 'jpeg'::text, 'png'::text, 'gif'::text, 'webp'::text] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_rules OWNER TO postgres;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value text NOT NULL,
    description text,
    description_ar text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    group_type text
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: TABLE system_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_config IS 'Generic key-value store for system configuration values. AI rules have been moved to ai_rules and ai_rule_parameters tables. AI prompt templates remain in system_config as they are configuration templates, not rules.';


--
-- Name: COLUMN system_config.group_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.system_config.group_type IS 'Groups configuration settings by type (auth, validation, pagination, contact, general) for better organization';


--
-- Name: system_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_key text NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    content_en text NOT NULL,
    content_ar text NOT NULL,
    description text,
    description_ar text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_content OWNER TO postgres;

--
-- Name: TABLE system_content; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_content IS 'Stores system content like terms of service, privacy policy, etc. in markdown format with bilingual support';


--
-- Name: user_merge_backups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_merge_backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merge_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    admin_user_id uuid NOT NULL,
    delete_source boolean DEFAULT false NOT NULL,
    backup_data jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    rolled_back_at timestamp with time zone,
    total_records_backed_up integer DEFAULT 0,
    total_records_migrated integer DEFAULT 0,
    errors jsonb,
    ip_address inet,
    user_agent text,
    notes text
);


ALTER TABLE public.user_merge_backups OWNER TO postgres;

--
-- Name: TABLE user_merge_backups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_merge_backups IS 'Stores backup snapshots of user data before merging accounts. Used for rollback capability.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'donor'::text NOT NULL,
    first_name text,
    last_name text,
    phone text,
    address text,
    profile_image text,
    is_active boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    notifications text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    tags jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Users table with unique constraints on email and phone. Email must be unique. Phone must be unique when not NULL (multiple NULL values allowed for users without phones).';


--
-- Name: COLUMN users.email_verified; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email_verified IS 'Indicates whether the user has verified their email address. Synced from auth.users.email_confirmed_at via trigger.';


--
-- Name: COLUMN users.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.notes IS 'Admin notes about the user';


--
-- Name: COLUMN users.tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.tags IS 'Array of tags for categorizing users';


--
-- Name: visitor_activity_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.visitor_activity_summary AS
 SELECT date_trunc('day'::text, created_at) AS date,
    activity_type,
    category,
    action,
    count(*) AS count,
    count(DISTINCT session_id) AS unique_visitor_sessions,
    count(DISTINCT ip_address) AS unique_visitor_ips,
    count(DISTINCT resource_path) AS unique_pages_viewed
   FROM public.site_activity_log
  WHERE (user_id IS NULL)
  GROUP BY (date_trunc('day'::text, created_at)), activity_type, category, action;


ALTER VIEW public.visitor_activity_summary OWNER TO postgres;

--
-- Name: VIEW visitor_activity_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.visitor_activity_summary IS 'Summary of anonymous visitor activities for analytics';


--
-- Name: visitor_sessions; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.visitor_sessions AS
 SELECT session_id,
    min(created_at) AS session_start,
    max(created_at) AS session_end,
    count(*) AS page_views,
    count(DISTINCT resource_path) AS unique_pages,
    array_agg(DISTINCT resource_path ORDER BY resource_path) AS pages_visited,
    max(ip_address) AS ip_address,
    max(user_agent) AS user_agent,
    EXTRACT(epoch FROM (max(created_at) - min(created_at))) AS session_duration_seconds
   FROM public.site_activity_log
  WHERE ((user_id IS NULL) AND ((activity_type)::text = 'page_view'::text))
  GROUP BY session_id;


ALTER VIEW public.visitor_sessions OWNER TO postgres;

--
-- Name: VIEW visitor_sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.visitor_sessions IS 'Visitor session tracking showing page views, duration, and journey';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_02_23; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_23 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_23 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_24; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_24 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_24 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_25; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_25 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_25 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_26; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_26 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_26 OWNER TO supabase_admin;

--
-- Name: messages_2026_02_27; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_27 OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: messages_2026_02_23; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_23 FOR VALUES FROM ('2026-02-23 00:00:00') TO ('2026-02-24 00:00:00');


--
-- Name: messages_2026_02_24; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_24 FOR VALUES FROM ('2026-02-24 00:00:00') TO ('2026-02-25 00:00:00');


--
-- Name: messages_2026_02_25; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_25 FOR VALUES FROM ('2026-02-25 00:00:00') TO ('2026-02-26 00:00:00');


--
-- Name: messages_2026_02_26; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_26 FOR VALUES FROM ('2026-02-26 00:00:00') TO ('2026-02-27 00:00:00');


--
-- Name: messages_2026_02_27; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_27 FOR VALUES FROM ('2026-02-27 00:00:00') TO ('2026-02-28 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_menu_items admin_menu_items_href_parent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_menu_items
    ADD CONSTRAINT admin_menu_items_href_parent_id_key UNIQUE (href, parent_id);


--
-- Name: admin_menu_items admin_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_menu_items
    ADD CONSTRAINT admin_menu_items_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_name_key UNIQUE (name);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_role_permissions admin_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_role_permissions admin_role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: admin_roles admin_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_name_key UNIQUE (name);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: admin_user_roles admin_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_user_roles
    ADD CONSTRAINT admin_user_roles_pkey PRIMARY KEY (id);


--
-- Name: admin_user_roles admin_user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_user_roles
    ADD CONSTRAINT admin_user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: ai_rule_parameters ai_rule_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rule_parameters
    ADD CONSTRAINT ai_rule_parameters_pkey PRIMARY KEY (id);


--
-- Name: ai_rule_parameters ai_rule_parameters_rule_key_parameter_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rule_parameters
    ADD CONSTRAINT ai_rule_parameters_rule_key_parameter_key_key UNIQUE (rule_key, parameter_key);


--
-- Name: ai_rules ai_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rules
    ADD CONSTRAINT ai_rules_pkey PRIMARY KEY (id);


--
-- Name: ai_rules ai_rules_rule_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rules
    ADD CONSTRAINT ai_rules_rule_key_key UNIQUE (rule_key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: batch_upload_items batch_upload_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_upload_items
    ADD CONSTRAINT batch_upload_items_pkey PRIMARY KEY (id);


--
-- Name: batch_uploads batch_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_uploads
    ADD CONSTRAINT batch_uploads_pkey PRIMARY KEY (id);


--
-- Name: beneficiaries beneficiaries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_pkey PRIMARY KEY (id);


--
-- Name: beneficiary_documents beneficiary_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_pkey PRIMARY KEY (id);


--
-- Name: case_categories case_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_categories
    ADD CONSTRAINT case_categories_pkey PRIMARY KEY (id);


--
-- Name: case_files case_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_files
    ADD CONSTRAINT case_files_pkey PRIMARY KEY (id);


--
-- Name: case_status_history case_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_status_history
    ADD CONSTRAINT case_status_history_pkey PRIMARY KEY (id);


--
-- Name: case_updates case_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_updates
    ADD CONSTRAINT case_updates_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: category_detection_rules category_detection_rules_category_id_keyword_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_detection_rules
    ADD CONSTRAINT category_detection_rules_category_id_keyword_unique UNIQUE (category_id, keyword);


--
-- Name: category_detection_rules category_detection_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_detection_rules
    ADD CONSTRAINT category_detection_rules_pkey PRIMARY KEY (id);


--
-- Name: cities cities_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_code_key UNIQUE (code);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: contribution_approval_status contribution_approval_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_approval_status
    ADD CONSTRAINT contribution_approval_status_pkey PRIMARY KEY (id);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: fcm_tokens fcm_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_pkey PRIMARY KEY (id);


--
-- Name: fcm_tokens fcm_tokens_user_id_fcm_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_user_id_fcm_token_key UNIQUE (user_id, fcm_token);


--
-- Name: id_types id_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_types
    ADD CONSTRAINT id_types_code_key UNIQUE (code);


--
-- Name: id_types id_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_types
    ADD CONSTRAINT id_types_pkey PRIMARY KEY (id);


--
-- Name: landing_contacts landing_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_contacts
    ADD CONSTRAINT landing_contacts_pkey PRIMARY KEY (id);


--
-- Name: landing_stats landing_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_stats
    ADD CONSTRAINT landing_stats_pkey PRIMARY KEY (id);


--
-- Name: landing_stats landing_stats_stat_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_stats
    ADD CONSTRAINT landing_stats_stat_key_key UNIQUE (stat_key);


--
-- Name: localization localization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localization
    ADD CONSTRAINT localization_pkey PRIMARY KEY (id);


--
-- Name: nickname_mappings nickname_mappings_nickname_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nickname_mappings
    ADD CONSTRAINT nickname_mappings_nickname_key UNIQUE (nickname);


--
-- Name: nickname_mappings nickname_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nickname_mappings
    ADD CONSTRAINT nickname_mappings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: project_cycles project_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_cycles
    ADD CONSTRAINT project_cycles_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: recurring_contributions recurring_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_contributions
    ADD CONSTRAINT recurring_contributions_pkey PRIMARY KEY (id);


--
-- Name: site_activity_log site_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_activity_log
    ADD CONSTRAINT site_activity_log_pkey PRIMARY KEY (id);


--
-- Name: sponsorships sponsorships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_pkey PRIMARY KEY (id);


--
-- Name: storage_rules storage_rules_bucket_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_rules
    ADD CONSTRAINT storage_rules_bucket_name_key UNIQUE (bucket_name);


--
-- Name: storage_rules storage_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_rules
    ADD CONSTRAINT storage_rules_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_config_key_key UNIQUE (config_key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_content system_content_content_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_content
    ADD CONSTRAINT system_content_content_key_key UNIQUE (content_key);


--
-- Name: system_content system_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_content
    ADD CONSTRAINT system_content_pkey PRIMARY KEY (id);


--
-- Name: beneficiaries unique_mobile_natid; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT unique_mobile_natid UNIQUE NULLS NOT DISTINCT (mobile_number, national_id);


--
-- Name: user_merge_backups user_merge_backups_merge_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_merge_backups
    ADD CONSTRAINT user_merge_backups_merge_id_key UNIQUE (merge_id);


--
-- Name: user_merge_backups user_merge_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_merge_backups
    ADD CONSTRAINT user_merge_backups_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: CONSTRAINT users_email_unique ON users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT users_email_unique ON public.users IS 'Ensures email addresses are unique across all user accounts.';


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_23 messages_2026_02_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_23
    ADD CONSTRAINT messages_2026_02_23_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_24 messages_2026_02_24_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_24
    ADD CONSTRAINT messages_2026_02_24_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_25 messages_2026_02_25_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_25
    ADD CONSTRAINT messages_2026_02_25_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_26 messages_2026_02_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_26
    ADD CONSTRAINT messages_2026_02_26_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_27 messages_2026_02_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_27
    ADD CONSTRAINT messages_2026_02_27_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: batch_upload_items_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_upload_items_batch_id_idx ON public.batch_upload_items USING btree (batch_id);


--
-- Name: batch_upload_items_case_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_upload_items_case_id_idx ON public.batch_upload_items USING btree (case_id);


--
-- Name: batch_upload_items_case_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_upload_items_case_number_idx ON public.batch_upload_items USING btree (case_number);


--
-- Name: batch_upload_items_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_upload_items_status_idx ON public.batch_upload_items USING btree (status);


--
-- Name: batch_upload_items_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_upload_items_user_id_idx ON public.batch_upload_items USING btree (user_id);


--
-- Name: batch_uploads_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_uploads_created_at_idx ON public.batch_uploads USING btree (created_at);


--
-- Name: batch_uploads_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_uploads_created_by_idx ON public.batch_uploads USING btree (created_by);


--
-- Name: batch_uploads_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX batch_uploads_status_idx ON public.batch_uploads USING btree (status);


--
-- Name: cases_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cases_batch_id_idx ON public.cases USING btree (batch_id);


--
-- Name: contributions_batch_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contributions_batch_id_idx ON public.contributions USING btree (batch_id);


--
-- Name: idx_admin_menu_items_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_menu_items_parent_id ON public.admin_menu_items USING btree (parent_id);


--
-- Name: idx_admin_menu_items_public_nav; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_menu_items_public_nav ON public.admin_menu_items USING btree (is_public_nav, sort_order) WHERE ((is_public_nav = true) AND (is_active = true));


--
-- Name: idx_admin_menu_items_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_menu_items_sort_order ON public.admin_menu_items USING btree (sort_order);


--
-- Name: idx_admin_permissions_resource_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_permissions_resource_action ON public.admin_permissions USING btree (resource, action);


--
-- Name: idx_admin_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_role_permissions_permission_id ON public.admin_role_permissions USING btree (permission_id);


--
-- Name: idx_admin_role_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_role_permissions_role_id ON public.admin_role_permissions USING btree (role_id);


--
-- Name: idx_admin_user_roles_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_user_roles_active ON public.admin_user_roles USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_admin_user_roles_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_user_roles_role_id ON public.admin_user_roles USING btree (role_id);


--
-- Name: idx_admin_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_user_roles_user_id ON public.admin_user_roles USING btree (user_id);


--
-- Name: idx_ai_rule_parameters_rule_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rule_parameters_rule_key ON public.ai_rule_parameters USING btree (rule_key);


--
-- Name: idx_ai_rules_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rules_active ON public.ai_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_ai_rules_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rules_group_id ON public.ai_rules USING btree (group_id);


--
-- Name: idx_ai_rules_lang; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rules_lang ON public.ai_rules USING btree (lang);


--
-- Name: idx_ai_rules_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rules_priority ON public.ai_rules USING btree (priority);


--
-- Name: idx_ai_rules_rule_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rules_rule_key ON public.ai_rules USING btree (rule_key);


--
-- Name: idx_ai_rules_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_rules_scope ON public.ai_rules USING btree (scope, scope_reference);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_beneficiaries_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_city ON public.beneficiaries USING btree (city);


--
-- Name: idx_beneficiaries_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_created_at ON public.beneficiaries USING btree (created_at DESC);


--
-- Name: idx_beneficiaries_is_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_is_verified ON public.beneficiaries USING btree (is_verified);


--
-- Name: idx_beneficiaries_mobile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_mobile ON public.beneficiaries USING btree (mobile_number) WHERE (mobile_number IS NOT NULL);


--
-- Name: idx_beneficiaries_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_name ON public.beneficiaries USING btree (name);


--
-- Name: idx_beneficiaries_name_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_name_search ON public.beneficiaries USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: idx_beneficiaries_national_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_national_id ON public.beneficiaries USING btree (national_id) WHERE (national_id IS NOT NULL);


--
-- Name: idx_beneficiaries_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_tags ON public.beneficiaries USING gin (tags);


--
-- Name: idx_beneficiaries_year_of_birth; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiaries_year_of_birth ON public.beneficiaries USING btree (year_of_birth);


--
-- Name: idx_beneficiary_documents_beneficiary_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiary_documents_beneficiary_id ON public.beneficiary_documents USING btree (beneficiary_id);


--
-- Name: idx_beneficiary_documents_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiary_documents_public ON public.beneficiary_documents USING btree (is_public);


--
-- Name: idx_beneficiary_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_beneficiary_documents_type ON public.beneficiary_documents USING btree (document_type);


--
-- Name: idx_case_files_case_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_case_files_case_id ON public.case_files USING btree (case_id);


--
-- Name: idx_case_files_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_case_files_category ON public.case_files USING btree (category);


--
-- Name: idx_case_files_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_case_files_display_order ON public.case_files USING btree (case_id, display_order);


--
-- Name: idx_case_files_file_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_case_files_file_type ON public.case_files USING btree (file_type);


--
-- Name: idx_case_files_filename; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_case_files_filename ON public.case_files USING btree (filename);


--
-- Name: idx_case_files_is_primary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_case_files_is_primary ON public.case_files USING btree (case_id, is_primary);


--
-- Name: idx_cases_beneficiary_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cases_beneficiary_id ON public.cases USING btree (beneficiary_id) WHERE (beneficiary_id IS NOT NULL);


--
-- Name: idx_category_detection_rules_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_category_detection_rules_active ON public.category_detection_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_category_detection_rules_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_category_detection_rules_category_id ON public.category_detection_rules USING btree (category_id);


--
-- Name: idx_category_detection_rules_keyword; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_category_detection_rules_keyword ON public.category_detection_rules USING btree (keyword);


--
-- Name: idx_contribution_latest_status_approval; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contribution_latest_status_approval ON public.contribution_approval_status USING btree (contribution_id, status, created_at DESC);


--
-- Name: idx_contributions_admin_queries; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contributions_admin_queries ON public.contributions USING btree (created_at DESC, donor_id);


--
-- Name: idx_contributions_case_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contributions_case_id ON public.contributions USING btree (case_id);


--
-- Name: idx_contributions_donor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contributions_donor_id ON public.contributions USING btree (donor_id);


--
-- Name: idx_fcm_tokens_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fcm_tokens_active ON public.fcm_tokens USING btree (active) WHERE (active = true);


--
-- Name: idx_fcm_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fcm_tokens_token ON public.fcm_tokens USING btree (fcm_token);


--
-- Name: idx_fcm_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fcm_tokens_user_id ON public.fcm_tokens USING btree (user_id);


--
-- Name: idx_landing_contacts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_contacts_created_at ON public.landing_contacts USING btree (created_at DESC);


--
-- Name: idx_landing_contacts_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_contacts_email ON public.landing_contacts USING btree (email);


--
-- Name: idx_landing_stats_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_stats_key ON public.landing_stats USING btree (stat_key);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_recipient_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient_created ON public.notifications USING btree (recipient_id, created_at DESC);


--
-- Name: idx_payment_methods_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_methods_code ON public.payment_methods USING btree (code);


--
-- Name: idx_payment_methods_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_methods_is_active ON public.payment_methods USING btree (is_active);


--
-- Name: idx_push_subscriptions_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_site_activity_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_action ON public.site_activity_log USING btree (action);


--
-- Name: idx_site_activity_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_category ON public.site_activity_log USING btree (category);


--
-- Name: idx_site_activity_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_created_at ON public.site_activity_log USING btree (created_at DESC);


--
-- Name: idx_site_activity_resource_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_resource_created ON public.site_activity_log USING btree (resource_type, resource_id, created_at DESC);


--
-- Name: idx_site_activity_resource_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_resource_id ON public.site_activity_log USING btree (resource_id);


--
-- Name: idx_site_activity_resource_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_resource_path ON public.site_activity_log USING btree (resource_path);


--
-- Name: idx_site_activity_resource_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_resource_type ON public.site_activity_log USING btree (resource_type);


--
-- Name: idx_site_activity_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_session_id ON public.site_activity_log USING btree (session_id);


--
-- Name: idx_site_activity_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_severity ON public.site_activity_log USING btree (severity);


--
-- Name: idx_site_activity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_type ON public.site_activity_log USING btree (activity_type);


--
-- Name: idx_site_activity_type_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_type_created ON public.site_activity_log USING btree (activity_type, created_at DESC);


--
-- Name: idx_site_activity_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_user_created ON public.site_activity_log USING btree (user_id, created_at DESC);


--
-- Name: idx_site_activity_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_user_id ON public.site_activity_log USING btree (user_id);


--
-- Name: idx_site_activity_user_id_merge; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_site_activity_user_id_merge ON public.site_activity_log USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_storage_rules_bucket_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_rules_bucket_name ON public.storage_rules USING btree (bucket_name);


--
-- Name: idx_system_config_group_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_group_type ON public.system_config USING btree (group_type);


--
-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_config_key ON public.system_config USING btree (config_key);


--
-- Name: idx_system_content_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_content_active ON public.system_content USING btree (is_active);


--
-- Name: idx_system_content_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_content_key ON public.system_content USING btree (content_key);


--
-- Name: idx_user_merge_backups_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_merge_backups_created_at ON public.user_merge_backups USING btree (created_at DESC);


--
-- Name: idx_user_merge_backups_from_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_merge_backups_from_user ON public.user_merge_backups USING btree (from_user_id);


--
-- Name: idx_user_merge_backups_merge_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_merge_backups_merge_id ON public.user_merge_backups USING btree (merge_id);


--
-- Name: idx_user_merge_backups_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_merge_backups_status ON public.user_merge_backups USING btree (status);


--
-- Name: idx_user_merge_backups_to_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_merge_backups_to_user ON public.user_merge_backups USING btree (to_user_id);


--
-- Name: nickname_mappings_nickname_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nickname_mappings_nickname_idx ON public.nickname_mappings USING btree (nickname);


--
-- Name: nickname_mappings_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nickname_mappings_user_id_idx ON public.nickname_mappings USING btree (user_id);


--
-- Name: users_phone_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_phone_unique ON public.users USING btree (phone) WHERE ((phone IS NOT NULL) AND (phone <> ''::text) AND (TRIM(BOTH FROM phone) <> ''::text));


--
-- Name: INDEX users_phone_unique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.users_phone_unique IS 'Ensures phone numbers are unique across all user accounts. IMPORTANT: Allows multiple NULL values, so users without phone numbers are not affected.';


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_23_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_23_inserted_at_topic_idx ON realtime.messages_2026_02_23 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_24_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_24_inserted_at_topic_idx ON realtime.messages_2026_02_24 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_25_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_25_inserted_at_topic_idx ON realtime.messages_2026_02_25 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_26_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_26_inserted_at_topic_idx ON realtime.messages_2026_02_26 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_27_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_27_inserted_at_topic_idx ON realtime.messages_2026_02_27 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_02_23_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_23_inserted_at_topic_idx;


--
-- Name: messages_2026_02_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_23_pkey;


--
-- Name: messages_2026_02_24_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_24_inserted_at_topic_idx;


--
-- Name: messages_2026_02_24_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_24_pkey;


--
-- Name: messages_2026_02_25_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_25_inserted_at_topic_idx;


--
-- Name: messages_2026_02_25_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_25_pkey;


--
-- Name: messages_2026_02_26_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_26_inserted_at_topic_idx;


--
-- Name: messages_2026_02_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_26_pkey;


--
-- Name: messages_2026_02_27_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_27_inserted_at_topic_idx;


--
-- Name: messages_2026_02_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_27_pkey;


--
-- Name: users on_auth_user_updated; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();


--
-- Name: users sync_email_verified_insert_trigger; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER sync_email_verified_insert_trigger AFTER INSERT ON auth.users FOR EACH ROW WHEN ((new.email_confirmed_at IS NOT NULL)) EXECUTE FUNCTION public.sync_email_verified_on_insert();


--
-- Name: users sync_email_verified_trigger; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER sync_email_verified_trigger AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN ((old.email_confirmed_at IS DISTINCT FROM new.email_confirmed_at)) EXECUTE FUNCTION public.sync_email_verified();


--
-- Name: case_files set_case_files_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_case_files_updated_at BEFORE UPDATE ON public.case_files FOR EACH ROW EXECUTE FUNCTION public.update_case_files_updated_at();


--
-- Name: storage_rules storage_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER storage_rules_updated_at BEFORE UPDATE ON public.storage_rules FOR EACH ROW EXECUTE FUNCTION public.update_storage_rules_updated_at();


--
-- Name: ai_rule_parameters trigger_update_ai_rule_parameters_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_ai_rule_parameters_updated_at BEFORE UPDATE ON public.ai_rule_parameters FOR EACH ROW EXECUTE FUNCTION public.update_ai_rules_updated_at();


--
-- Name: ai_rules trigger_update_ai_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_ai_rules_updated_at BEFORE UPDATE ON public.ai_rules FOR EACH ROW EXECUTE FUNCTION public.update_ai_rules_updated_at();


--
-- Name: beneficiaries trigger_update_beneficiaries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_beneficiaries_updated_at BEFORE UPDATE ON public.beneficiaries FOR EACH ROW EXECUTE FUNCTION public.update_beneficiaries_updated_at();


--
-- Name: cases trigger_update_beneficiary_case_counts; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_beneficiary_case_counts AFTER INSERT OR DELETE OR UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_beneficiary_case_counts();


--
-- Name: beneficiary_documents update_beneficiary_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_beneficiary_documents_updated_at BEFORE UPDATE ON public.beneficiary_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fcm_tokens update_fcm_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_fcm_tokens_updated_at BEFORE UPDATE ON public.fcm_tokens FOR EACH ROW EXECUTE FUNCTION public.update_fcm_tokens_updated_at();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_push_subscriptions_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_menu_items admin_menu_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_menu_items
    ADD CONSTRAINT admin_menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.admin_menu_items(id) ON DELETE CASCADE;


--
-- Name: admin_menu_items admin_menu_items_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_menu_items
    ADD CONSTRAINT admin_menu_items_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id) ON DELETE SET NULL;


--
-- Name: admin_role_permissions admin_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id) ON DELETE CASCADE;


--
-- Name: admin_role_permissions admin_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;


--
-- Name: admin_user_roles admin_user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_user_roles
    ADD CONSTRAINT admin_user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: admin_user_roles admin_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_user_roles
    ADD CONSTRAINT admin_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;


--
-- Name: admin_user_roles admin_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_user_roles
    ADD CONSTRAINT admin_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_rule_parameters ai_rule_parameters_rule_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rule_parameters
    ADD CONSTRAINT ai_rule_parameters_rule_key_fkey FOREIGN KEY (rule_key) REFERENCES public.ai_rules(rule_key) ON DELETE CASCADE;


--
-- Name: ai_rules ai_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rules
    ADD CONSTRAINT ai_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_rules ai_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_rules
    ADD CONSTRAINT ai_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: batch_upload_items batch_upload_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_upload_items
    ADD CONSTRAINT batch_upload_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_uploads(id) ON DELETE CASCADE;


--
-- Name: batch_upload_items batch_upload_items_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_upload_items
    ADD CONSTRAINT batch_upload_items_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: batch_upload_items batch_upload_items_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_upload_items
    ADD CONSTRAINT batch_upload_items_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contributions(id);


--
-- Name: batch_upload_items batch_upload_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_upload_items
    ADD CONSTRAINT batch_upload_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: batch_uploads batch_uploads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_uploads
    ADD CONSTRAINT batch_uploads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: beneficiaries beneficiaries_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: beneficiaries beneficiaries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: beneficiaries beneficiaries_id_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiaries
    ADD CONSTRAINT beneficiaries_id_type_id_fkey FOREIGN KEY (id_type_id) REFERENCES public.id_types(id);


--
-- Name: beneficiary_documents beneficiary_documents_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE CASCADE;


--
-- Name: beneficiary_documents beneficiary_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.beneficiary_documents
    ADD CONSTRAINT beneficiary_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: case_files case_files_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_files
    ADD CONSTRAINT case_files_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_files case_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_files
    ADD CONSTRAINT case_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: case_status_history case_status_history_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_status_history
    ADD CONSTRAINT case_status_history_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: case_status_history case_status_history_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_status_history
    ADD CONSTRAINT case_status_history_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: case_updates case_updates_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_updates
    ADD CONSTRAINT case_updates_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: case_updates case_updates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_updates
    ADD CONSTRAINT case_updates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: cases cases_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: cases cases_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_uploads(id) ON DELETE SET NULL;


--
-- Name: cases cases_beneficiary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE SET NULL;


--
-- Name: cases cases_category_id_case_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_category_id_case_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.case_categories(id);


--
-- Name: cases cases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: cases cases_sponsored_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_sponsored_by_users_id_fk FOREIGN KEY (sponsored_by) REFERENCES public.users(id);


--
-- Name: category_detection_rules category_detection_rules_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_detection_rules
    ADD CONSTRAINT category_detection_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.case_categories(id) ON DELETE CASCADE;


--
-- Name: category_detection_rules category_detection_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_detection_rules
    ADD CONSTRAINT category_detection_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: category_detection_rules category_detection_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_detection_rules
    ADD CONSTRAINT category_detection_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: communications communications_recipient_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: communications communications_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: contribution_approval_status contribution_approval_status_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_approval_status
    ADD CONSTRAINT contribution_approval_status_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contribution_approval_status contribution_approval_status_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_approval_status
    ADD CONSTRAINT contribution_approval_status_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contributions(id) ON DELETE CASCADE;


--
-- Name: contributions contributions_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_uploads(id) ON DELETE SET NULL;


--
-- Name: contributions contributions_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: contributions contributions_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.users(id);


--
-- Name: contributions contributions_payment_method_id_payment_methods_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_payment_method_id_payment_methods_id_fk FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);


--
-- Name: contributions contributions_project_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_project_cycle_id_fkey FOREIGN KEY (project_cycle_id) REFERENCES public.project_cycles(id);


--
-- Name: contributions contributions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: fcm_tokens fcm_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: landing_stats landing_stats_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_stats
    ADD CONSTRAINT landing_stats_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: nickname_mappings nickname_mappings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nickname_mappings
    ADD CONSTRAINT nickname_mappings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: nickname_mappings nickname_mappings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nickname_mappings
    ADD CONSTRAINT nickname_mappings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_recipient_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: project_cycles project_cycles_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_cycles
    ADD CONSTRAINT project_cycles_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: projects projects_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: projects projects_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recurring_contributions recurring_contributions_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_contributions
    ADD CONSTRAINT recurring_contributions_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: recurring_contributions recurring_contributions_donor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_contributions
    ADD CONSTRAINT recurring_contributions_donor_id_users_id_fk FOREIGN KEY (donor_id) REFERENCES public.users(id);


--
-- Name: recurring_contributions recurring_contributions_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_contributions
    ADD CONSTRAINT recurring_contributions_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: site_activity_log site_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_activity_log
    ADD CONSTRAINT site_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: sponsorships sponsorships_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: sponsorships sponsorships_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: sponsorships sponsorships_sponsor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_sponsor_id_users_id_fk FOREIGN KEY (sponsor_id) REFERENCES public.users(id);


--
-- Name: system_config system_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: system_content system_content_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_content
    ADD CONSTRAINT system_content_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: user_merge_backups user_merge_backups_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_merge_backups
    ADD CONSTRAINT user_merge_backups_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id);


--
-- Name: user_merge_backups user_merge_backups_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_merge_backups
    ADD CONSTRAINT user_merge_backups_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_merge_backups user_merge_backups_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_merge_backups
    ADD CONSTRAINT user_merge_backups_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: site_activity_log Admins can delete activity logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete activity logs" ON public.site_activity_log FOR DELETE USING ((auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM public.admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM public.admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true)))));


--
-- Name: ai_rule_parameters Admins can delete ai_rule_parameters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete ai_rule_parameters" ON public.ai_rule_parameters FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: ai_rules Admins can delete ai_rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete ai_rules" ON public.ai_rules FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: beneficiary_documents Admins can delete beneficiary documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete beneficiary documents" ON public.beneficiary_documents FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])) AND (r.is_active = true)))));


--
-- Name: case_categories Admins can delete case categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete case categories" ON public.case_categories FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: cases Admins can delete cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete cases" ON public.cases FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: contribution_approval_status Admins can delete contribution approval statuses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete contribution approval statuses" ON public.contribution_approval_status FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: payment_methods Admins can delete payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete payment methods" ON public.payment_methods FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: admin_role_permissions Admins can delete role permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete role permissions" ON public.admin_role_permissions FOR DELETE USING (public.is_current_user_admin());


--
-- Name: ai_rule_parameters Admins can insert ai_rule_parameters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert ai_rule_parameters" ON public.ai_rule_parameters FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: ai_rules Admins can insert ai_rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert ai_rules" ON public.ai_rules FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: cases Admins can insert any cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert any cases" ON public.cases FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: contributions Admins can insert any contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert any contributions" ON public.contributions FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: beneficiary_documents Admins can insert beneficiary documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert beneficiary documents" ON public.beneficiary_documents FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])) AND (r.is_active = true)))));


--
-- Name: case_categories Admins can insert case categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert case categories" ON public.case_categories FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: cases Admins can insert cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert cases" ON public.cases FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: contribution_approval_status Admins can insert contribution approval statuses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert contribution approval statuses" ON public.contribution_approval_status FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: payment_methods Admins can insert payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert payment methods" ON public.payment_methods FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: admin_role_permissions Admins can insert role permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert role permissions" ON public.admin_role_permissions FOR INSERT WITH CHECK (public.is_current_user_admin());


--
-- Name: admin_user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert user roles" ON public.admin_user_roles FOR INSERT WITH CHECK (public.is_current_user_admin());


--
-- Name: case_updates Admins can manage case updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage case updates" ON public.case_updates USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: ai_rule_parameters Admins can update ai_rule_parameters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update ai_rule_parameters" ON public.ai_rule_parameters FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: ai_rules Admins can update ai_rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update ai_rules" ON public.ai_rules FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: cases Admins can update any cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update any cases" ON public.cases FOR UPDATE USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: contributions Admins can update any contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update any contributions" ON public.contributions FOR UPDATE USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));


--
-- Name: beneficiary_documents Admins can update beneficiary documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update beneficiary documents" ON public.beneficiary_documents FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])) AND (r.is_active = true)))));


--
-- Name: case_categories Admins can update case categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update case categories" ON public.case_categories FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: cases Admins can update cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update cases" ON public.cases FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: contribution_approval_status Admins can update contribution approval statuses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update contribution approval statuses" ON public.contribution_approval_status FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: user_merge_backups Admins can update merge backups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update merge backups" ON public.user_merge_backups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles aur
     JOIN public.admin_roles ar ON ((aur.role_id = ar.id)))
  WHERE ((aur.user_id = auth.uid()) AND ((ar.name)::text = 'super_admin'::text)))));


--
-- Name: payment_methods Admins can update payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update payment methods" ON public.payment_methods FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: admin_user_roles Admins can update user roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update user roles" ON public.admin_user_roles FOR UPDATE USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());


--
-- Name: fcm_tokens Admins can view all FCM tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all FCM tokens" ON public.fcm_tokens FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles aur
     JOIN public.admin_roles ar ON ((aur.role_id = ar.id)))
  WHERE ((aur.user_id = auth.uid()) AND ((ar.name)::text = 'admin'::text)))));


--
-- Name: ai_rule_parameters Admins can view all ai_rule_parameters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all ai_rule_parameters" ON public.ai_rule_parameters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: ai_rules Admins can view all ai_rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all ai_rules" ON public.ai_rules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: case_categories Admins can view all case categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all case categories" ON public.case_categories FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: cases Admins can view all cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all cases" ON public.cases FOR SELECT USING (((auth.uid() IS NOT NULL) AND (public.is_admin_user(auth.uid()) = true)));


--
-- Name: category_detection_rules Admins can view all category detection rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all category detection rules" ON public.category_detection_rules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])) AND (r.is_active = true)))));


--
-- Name: contribution_approval_status Admins can view all contribution approval statuses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all contribution approval statuses" ON public.contribution_approval_status FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: contributions Admins can view all contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all contributions" ON public.contributions FOR SELECT USING (((auth.uid() IS NOT NULL) AND (public.is_admin_user(auth.uid()) = true)));


--
-- Name: notifications Admins can view all notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND (r.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))
 LIMIT 1))));


--
-- Name: payment_methods Admins can view all payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all payment methods" ON public.payment_methods FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: push_subscriptions Admins can view all push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all push subscriptions" ON public.push_subscriptions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles aur
     JOIN public.admin_roles ar ON ((aur.role_id = ar.id)))
  WHERE ((aur.user_id = auth.uid()) AND ((ar.name)::text = 'admin'::text)))));


--
-- Name: admin_user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all user roles" ON public.admin_user_roles FOR SELECT USING (public.is_current_user_admin());


--
-- Name: users Admins can view all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: user_merge_backups Admins can view merge backups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view merge backups" ON public.user_merge_backups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles aur
     JOIN public.admin_roles ar ON ((aur.role_id = ar.id)))
  WHERE ((aur.user_id = auth.uid()) AND ((ar.name)::text = 'super_admin'::text)))));


--
-- Name: beneficiary_documents Admins have full access to beneficiary documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access to beneficiary documents" ON public.beneficiary_documents USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])) AND (r.is_active = true)))));


--
-- Name: system_content Anyone can read active system content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read active system content" ON public.system_content FOR SELECT USING ((is_active = true));


--
-- Name: landing_stats Anyone can read landing stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read landing stats" ON public.landing_stats FOR SELECT USING (true);


--
-- Name: system_config Anyone can read system config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read system config" ON public.system_config FOR SELECT USING (true);


--
-- Name: landing_contacts Anyone can submit contact form; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can submit contact form" ON public.landing_contacts FOR INSERT WITH CHECK (true);


--
-- Name: case_categories Anyone can view active case categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active case categories" ON public.case_categories FOR SELECT USING ((is_active = true));


--
-- Name: category_detection_rules Anyone can view active category detection rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active category detection rules" ON public.category_detection_rules FOR SELECT USING ((is_active = true));


--
-- Name: admin_menu_items Anyone can view active menu items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active menu items" ON public.admin_menu_items FOR SELECT USING ((is_active = true));


--
-- Name: payment_methods Anyone can view active payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT USING ((is_active = true));


--
-- Name: admin_permissions Anyone can view active permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active permissions" ON public.admin_permissions FOR SELECT USING ((is_active = true));


--
-- Name: admin_roles Anyone can view active roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active roles" ON public.admin_roles FOR SELECT USING ((is_active = true));


--
-- Name: cities Anyone can view cities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT USING ((is_active = true));


--
-- Name: id_types Anyone can view id_types; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view id_types" ON public.id_types FOR SELECT USING ((is_active = true));


--
-- Name: admin_role_permissions Anyone can view role permissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view role permissions" ON public.admin_role_permissions FOR SELECT USING (true);


--
-- Name: system_content Authenticated users can delete system content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can delete system content" ON public.system_content FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: landing_stats Authenticated users can insert landing stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert landing stats" ON public.landing_stats FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_config Authenticated users can insert system config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert system config" ON public.system_config FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_content Authenticated users can insert system content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert system content" ON public.system_content FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: system_content Authenticated users can read all system content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read all system content" ON public.system_content FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: landing_stats Authenticated users can update landing stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update landing stats" ON public.landing_stats FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: system_config Authenticated users can update system config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update system config" ON public.system_config FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: system_content Authenticated users can update system content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update system content" ON public.system_content FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: beneficiaries Authenticated users can view beneficiaries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view beneficiaries" ON public.beneficiaries FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: beneficiary_documents Authenticated users can view beneficiary documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view beneficiary documents" ON public.beneficiary_documents FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: landing_contacts No updates or deletes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "No updates or deletes" ON public.landing_contacts USING (false) WITH CHECK (false);


--
-- Name: contribution_approval_status Public can view approved contribution status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view approved contribution status" ON public.contribution_approval_status FOR SELECT USING ((status = 'approved'::text));


--
-- Name: contributions Public can view approved contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view approved contributions" ON public.contributions FOR SELECT USING (public.check_contribution_approved(id));


--
-- Name: users Public can view names for approved contributors; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view names for approved contributors" ON public.users FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.contributions c
     JOIN public.contribution_approval_status cas ON ((cas.contribution_id = c.id)))
  WHERE ((c.donor_id = users.id) AND (cas.status = 'approved'::text)))));


--
-- Name: case_updates Public can view public case updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view public case updates" ON public.case_updates FOR SELECT USING ((is_public = true));


--
-- Name: cases Public can view published cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view published cases" ON public.cases FOR SELECT USING ((status = 'published'::text));


--
-- Name: notifications Service can insert notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: admin_menu_items Super admins can delete menu items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admins can delete menu items" ON public.admin_menu_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true)))));


--
-- Name: admin_menu_items Super admins can insert menu items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admins can insert menu items" ON public.admin_menu_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true)))));


--
-- Name: category_detection_rules Super admins can manage category detection rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admins can manage category detection rules" ON public.category_detection_rules USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true)))));


--
-- Name: admin_menu_items Super admins can update menu items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admins can update menu items" ON public.admin_menu_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true)))));


--
-- Name: admin_menu_items Super admins can view all menu items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admins can view all menu items" ON public.admin_menu_items FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = 'super_admin'::text) AND (r.is_active = true))))));


--
-- Name: site_activity_log System can insert activity logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert activity logs" ON public.site_activity_log FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: user_merge_backups System can insert merge backups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert merge backups" ON public.user_merge_backups FOR INSERT WITH CHECK (true);


--
-- Name: fcm_tokens Users can delete their own FCM tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own FCM tokens" ON public.fcm_tokens FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can delete their own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cases Users can insert own cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own cases" ON public.cases FOR INSERT WITH CHECK ((created_by = auth.uid()));


--
-- Name: contributions Users can insert own contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own contributions" ON public.contributions FOR INSERT WITH CHECK ((donor_id = auth.uid()));


--
-- Name: fcm_tokens Users can insert their own FCM tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own FCM tokens" ON public.fcm_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can insert their own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: contribution_approval_status Users can update donor reply for own contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update donor reply for own contributions" ON public.contribution_approval_status FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.contributions c
  WHERE ((c.id = contribution_approval_status.contribution_id) AND (c.donor_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.contributions c
  WHERE ((c.id = contribution_approval_status.contribution_id) AND (c.donor_id = auth.uid())))));


--
-- Name: cases Users can update own cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own cases" ON public.cases FOR UPDATE USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: contributions Users can update own contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own contributions" ON public.contributions FOR UPDATE USING ((donor_id = auth.uid())) WITH CHECK ((donor_id = auth.uid()));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid()))) WITH CHECK (((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid())));


--
-- Name: fcm_tokens Users can update their own FCM tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own FCM tokens" ON public.fcm_tokens FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can update their own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: case_updates Users can view all case updates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view all case updates" ON public.case_updates FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: site_activity_log Users can view own activity logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own activity logs" ON public.site_activity_log FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM public.admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM public.admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true)))) OR ((user_id IS NULL) AND (auth.uid() IN ( SELECT admin_user_roles.user_id
   FROM public.admin_user_roles
  WHERE ((admin_user_roles.role_id IN ( SELECT admin_roles.id
           FROM public.admin_roles
          WHERE ((admin_roles.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))) AND (admin_user_roles.is_active = true)))))));


--
-- Name: audit_logs Users can view own audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cases Users can view own cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own cases" ON public.cases FOR SELECT USING (((auth.uid() IS NOT NULL) AND (created_by = auth.uid())));


--
-- Name: contribution_approval_status Users can view own contribution approval status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own contribution approval status" ON public.contribution_approval_status FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.contributions c
  WHERE ((c.id = contribution_approval_status.contribution_id) AND (c.donor_id = auth.uid())))));


--
-- Name: contributions Users can view own contributions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own contributions" ON public.contributions FOR SELECT USING (((auth.uid() IS NOT NULL) AND (donor_id = auth.uid())));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid())));


--
-- Name: users Users can view own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (((auth.uid() IS NOT NULL) AND (auth.uid() = id)));


--
-- Name: fcm_tokens Users can view their own FCM tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own FCM tokens" ON public.fcm_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cases Users can view their own cases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own cases" ON public.cases FOR SELECT USING (((auth.uid() IS NOT NULL) AND (created_by = auth.uid())));


--
-- Name: push_subscriptions Users can view their own push subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own roles" ON public.admin_user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_menu_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_role_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_rule_parameters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_rule_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: beneficiaries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

--
-- Name: beneficiary_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.beneficiary_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: case_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.case_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: case_updates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

--
-- Name: category_detection_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.category_detection_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: cities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution_approval_status; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contribution_approval_status ENABLE ROW LEVEL SECURITY;

--
-- Name: contributions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: fcm_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: id_types; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.id_types ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_contacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.landing_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.landing_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: site_activity_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.site_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.storage_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_rules storage_rules_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY storage_rules_delete ON public.storage_rules FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: storage_rules storage_rules_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY storage_rules_insert ON public.storage_rules FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: storage_rules storage_rules_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY storage_rules_select ON public.storage_rules FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: storage_rules storage_rules_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY storage_rules_update ON public.storage_rules FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));


--
-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

--
-- Name: system_content; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.system_content ENABLE ROW LEVEL SECURITY;

--
-- Name: user_merge_backups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_merge_backups ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users all" ON public.users USING (true) WITH CHECK (true);


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects beneficiaries_admin_access; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY beneficiaries_admin_access ON storage.objects USING (((bucket_id = 'beneficiaries'::text) AND (EXISTS ( SELECT 1
   FROM (public.admin_user_roles ur
     JOIN public.admin_roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = auth.uid()) AND (ur.is_active = true) AND ((r.name)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))));


--
-- Name: objects beneficiaries_authenticated_read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY beneficiaries_authenticated_read ON storage.objects FOR SELECT USING (((bucket_id = 'beneficiaries'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects beneficiaries_authenticated_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY beneficiaries_authenticated_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'beneficiaries'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects beneficiaries_owner_delete; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY beneficiaries_owner_delete ON storage.objects FOR DELETE USING (((bucket_id = 'beneficiaries'::text) AND (auth.uid() = owner)));


--
-- Name: objects beneficiaries_owner_update; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY beneficiaries_owner_update ON storage.objects FOR UPDATE USING (((bucket_id = 'beneficiaries'::text) AND (auth.uid() = owner)));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: objects case_files_authenticated_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY case_files_authenticated_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'case-files'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects case_files_public_read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY case_files_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'case-files'::text));


--
-- Name: objects case_images_authenticated_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY case_images_authenticated_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'case-images'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects case_images_public_read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY case_images_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'case-images'::text));


--
-- Name: objects contributions_authenticated_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY contributions_authenticated_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'contributions'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects contributions_owner_access; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY contributions_owner_access ON storage.objects USING (((bucket_id = 'contributions'::text) AND (auth.uid() = owner)));


--
-- Name: objects contributions_public_read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY contributions_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'contributions'::text));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: objects recurring_authenticated_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY recurring_authenticated_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'recurring_contributions'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects recurring_owner_manage; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY recurring_owner_manage ON storage.objects USING (((bucket_id = 'recurring_contributions'::text) AND (auth.uid() = owner)));


--
-- Name: objects recurring_public_read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY recurring_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'recurring_contributions'::text));


--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: objects sponsor_apps_authenticated_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY sponsor_apps_authenticated_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'sponsor_applications'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects sponsor_apps_owner_access; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY sponsor_apps_owner_access ON storage.objects USING (((bucket_id = 'sponsor_applications'::text) AND (auth.uid() = owner)));


--
-- Name: objects users_owner_manage; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY users_owner_manage ON storage.objects USING (((bucket_id = 'users'::text) AND (auth.uid() = owner)));


--
-- Name: objects users_owner_upload; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY users_owner_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'users'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects users_public_read; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY users_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'users'::text));


--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: supabase_admin
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION hypopg(OUT indexname text, OUT indexrelid oid, OUT indrelid oid, OUT innatts integer, OUT indisunique boolean, OUT indkey int2vector, OUT indcollation oidvector, OUT indclass oidvector, OUT indoption oidvector, OUT indexprs pg_node_tree, OUT indpred pg_node_tree, OUT amid oid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg(OUT indexname text, OUT indexrelid oid, OUT indrelid oid, OUT innatts integer, OUT indisunique boolean, OUT indkey int2vector, OUT indcollation oidvector, OUT indclass oidvector, OUT indoption oidvector, OUT indexprs pg_node_tree, OUT indpred pg_node_tree, OUT amid oid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_create_index(sql_order text, OUT indexrelid oid, OUT indexname text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_create_index(sql_order text, OUT indexrelid oid, OUT indexname text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_drop_index(indexid oid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_drop_index(indexid oid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_get_indexdef(indexid oid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_get_indexdef(indexid oid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_hidden_indexes(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_hidden_indexes() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_hide_index(indexid oid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_hide_index(indexid oid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_relation_size(indexid oid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_relation_size(indexid oid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_reset(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_reset() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_reset_index(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_reset_index() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_unhide_all_indexes(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_unhide_all_indexes() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hypopg_unhide_index(indexid oid); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hypopg_unhide_index(indexid oid) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION index_advisor(query text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.index_advisor(query text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION check_contribution_approved(contribution_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_contribution_approved(contribution_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.check_contribution_approved(contribution_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_contribution_approved(contribution_id_param uuid) TO service_role;


--
-- Name: FUNCTION cleanup_old_activity_logs(retention_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_activity_logs(retention_days integer) TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_activity_logs(retention_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_activity_logs(retention_days integer) TO service_role;


--
-- Name: FUNCTION count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.count_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text) TO anon;
GRANT ALL ON FUNCTION public.create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text) TO authenticated;
GRANT ALL ON FUNCTION public.create_user_merge_backup(p_merge_id uuid, p_from_user_id uuid, p_to_user_id uuid, p_admin_user_id uuid, p_delete_source boolean, p_ip_address inet, p_user_agent text) TO service_role;


--
-- Name: FUNCTION delete_beneficiary_with_documents(p_beneficiary_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_beneficiary_with_documents(p_beneficiary_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_beneficiary_with_documents(p_beneficiary_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_beneficiary_with_documents(p_beneficiary_id uuid) TO service_role;


--
-- Name: FUNCTION delete_case_cascaded(case_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_case_cascaded(case_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_case_cascaded(case_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_case_cascaded(case_id uuid) TO service_role;


--
-- Name: FUNCTION get_contribution_stats(p_donor_id uuid, p_is_admin boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_contribution_stats(p_donor_id uuid, p_is_admin boolean) TO anon;
GRANT ALL ON FUNCTION public.get_contribution_stats(p_donor_id uuid, p_is_admin boolean) TO authenticated;
GRANT ALL ON FUNCTION public.get_contribution_stats(p_donor_id uuid, p_is_admin boolean) TO service_role;


--
-- Name: FUNCTION get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) TO anon;
GRANT ALL ON FUNCTION public.get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) TO authenticated;
GRANT ALL ON FUNCTION public.get_contributions_filtered(p_status text, p_donor_id uuid, p_is_admin boolean, p_limit integer, p_offset integer, p_sort_by text, p_sort_order text) TO service_role;


--
-- Name: FUNCTION get_user_menu_items(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_menu_items(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_menu_items(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_menu_items(user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_notifications_sorted(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_notifications_sorted(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_notifications_sorted(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_notifications_sorted(user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_permission_names(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_permission_names(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_permission_names(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_permission_names(user_id uuid) TO service_role;


--
-- Name: FUNCTION handle_auth_user_updated(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_auth_user_updated() TO anon;
GRANT ALL ON FUNCTION public.handle_auth_user_updated() TO authenticated;
GRANT ALL ON FUNCTION public.handle_auth_user_updated() TO service_role;


--
-- Name: FUNCTION is_admin_user(check_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin_user(check_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_admin_user(check_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_admin_user(check_user_id uuid) TO service_role;


--
-- Name: FUNCTION is_current_user_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_current_user_admin() TO anon;
GRANT ALL ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_current_user_admin() TO service_role;


--
-- Name: FUNCTION rbac_audit_role_permissions_trigger(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rbac_audit_role_permissions_trigger() TO anon;
GRANT ALL ON FUNCTION public.rbac_audit_role_permissions_trigger() TO authenticated;
GRANT ALL ON FUNCTION public.rbac_audit_role_permissions_trigger() TO service_role;


--
-- Name: FUNCTION rbac_audit_user_roles_trigger(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rbac_audit_user_roles_trigger() TO anon;
GRANT ALL ON FUNCTION public.rbac_audit_user_roles_trigger() TO authenticated;
GRANT ALL ON FUNCTION public.rbac_audit_user_roles_trigger() TO service_role;


--
-- Name: FUNCTION rbac_cleanup_audit_logs(p_retention_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rbac_cleanup_audit_logs(p_retention_days integer) TO anon;
GRANT ALL ON FUNCTION public.rbac_cleanup_audit_logs(p_retention_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.rbac_cleanup_audit_logs(p_retention_days integer) TO service_role;


--
-- Name: FUNCTION rbac_log_change(p_user_id uuid, p_action character varying, p_table_name character varying, p_record_id uuid, p_old_values jsonb, p_new_values jsonb, p_session_id character varying, p_request_id character varying, p_severity character varying, p_category character varying, p_details jsonb, p_metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rbac_log_change(p_user_id uuid, p_action character varying, p_table_name character varying, p_record_id uuid, p_old_values jsonb, p_new_values jsonb, p_session_id character varying, p_request_id character varying, p_severity character varying, p_category character varying, p_details jsonb, p_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.rbac_log_change(p_user_id uuid, p_action character varying, p_table_name character varying, p_record_id uuid, p_old_values jsonb, p_new_values jsonb, p_session_id character varying, p_request_id character varying, p_severity character varying, p_category character varying, p_details jsonb, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.rbac_log_change(p_user_id uuid, p_action character varying, p_table_name character varying, p_record_id uuid, p_old_values jsonb, p_new_values jsonb, p_session_id character varying, p_request_id character varying, p_severity character varying, p_category character varying, p_details jsonb, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION rbac_log_permission_change(p_user_id uuid, p_role_name character varying, p_permission_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rbac_log_permission_change(p_user_id uuid, p_role_name character varying, p_permission_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) TO anon;
GRANT ALL ON FUNCTION public.rbac_log_permission_change(p_user_id uuid, p_role_name character varying, p_permission_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) TO authenticated;
GRANT ALL ON FUNCTION public.rbac_log_permission_change(p_user_id uuid, p_role_name character varying, p_permission_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) TO service_role;


--
-- Name: FUNCTION rbac_log_role_assignment(p_user_id uuid, p_target_user_id uuid, p_role_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rbac_log_role_assignment(p_user_id uuid, p_target_user_id uuid, p_role_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) TO anon;
GRANT ALL ON FUNCTION public.rbac_log_role_assignment(p_user_id uuid, p_target_user_id uuid, p_role_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) TO authenticated;
GRANT ALL ON FUNCTION public.rbac_log_role_assignment(p_user_id uuid, p_target_user_id uuid, p_role_name character varying, p_action character varying, p_session_id character varying, p_request_id character varying) TO service_role;


--
-- Name: FUNCTION search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_contributions(p_user_id uuid, p_is_admin boolean, p_status text, p_search text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION sync_email_verified(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_email_verified() TO anon;
GRANT ALL ON FUNCTION public.sync_email_verified() TO authenticated;
GRANT ALL ON FUNCTION public.sync_email_verified() TO service_role;


--
-- Name: FUNCTION sync_email_verified_on_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_email_verified_on_insert() TO anon;
GRANT ALL ON FUNCTION public.sync_email_verified_on_insert() TO authenticated;
GRANT ALL ON FUNCTION public.sync_email_verified_on_insert() TO service_role;


--
-- Name: FUNCTION update_ai_rules_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_ai_rules_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_ai_rules_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_ai_rules_updated_at() TO service_role;


--
-- Name: FUNCTION update_beneficiaries_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_beneficiaries_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_beneficiaries_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_beneficiaries_updated_at() TO service_role;


--
-- Name: FUNCTION update_beneficiary_case_counts(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_beneficiary_case_counts() TO anon;
GRANT ALL ON FUNCTION public.update_beneficiary_case_counts() TO authenticated;
GRANT ALL ON FUNCTION public.update_beneficiary_case_counts() TO service_role;


--
-- Name: FUNCTION update_case_files_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_case_files_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_case_files_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_case_files_updated_at() TO service_role;


--
-- Name: FUNCTION update_fcm_tokens_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_fcm_tokens_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_fcm_tokens_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_fcm_tokens_updated_at() TO service_role;


--
-- Name: FUNCTION update_push_subscriptions_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_push_subscriptions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_push_subscriptions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_push_subscriptions_updated_at() TO service_role;


--
-- Name: FUNCTION update_storage_rules_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_storage_rules_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_storage_rules_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_storage_rules_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION user_has_permission(user_id uuid, permission_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_has_permission(user_id uuid, permission_name text) TO anon;
GRANT ALL ON FUNCTION public.user_has_permission(user_id uuid, permission_name text) TO authenticated;
GRANT ALL ON FUNCTION public.user_has_permission(user_id uuid, permission_name text) TO service_role;


--
-- Name: FUNCTION user_has_role(user_id uuid, role_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_has_role(user_id uuid, role_name text) TO anon;
GRANT ALL ON FUNCTION public.user_has_role(user_id uuid, role_name text) TO authenticated;
GRANT ALL ON FUNCTION public.user_has_role(user_id uuid, role_name text) TO service_role;


--
-- Name: FUNCTION verify_user_merge_readiness(source_user_id uuid, target_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_user_merge_readiness(source_user_id uuid, target_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.verify_user_merge_readiness(source_user_id uuid, target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.verify_user_merge_readiness(source_user_id uuid, target_user_id uuid) TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE webauthn_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_challenges TO postgres;
GRANT ALL ON TABLE auth.webauthn_challenges TO dashboard_user;


--
-- Name: TABLE webauthn_credentials; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_credentials TO postgres;
GRANT ALL ON TABLE auth.webauthn_credentials TO dashboard_user;


--
-- Name: TABLE hypopg_list_indexes; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.hypopg_list_indexes TO postgres WITH GRANT OPTION;


--
-- Name: TABLE hypopg_hidden_indexes; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.hypopg_hidden_indexes TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE admin_menu_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_menu_items TO anon;
GRANT ALL ON TABLE public.admin_menu_items TO authenticated;
GRANT ALL ON TABLE public.admin_menu_items TO service_role;


--
-- Name: TABLE admin_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_permissions TO anon;
GRANT ALL ON TABLE public.admin_permissions TO authenticated;
GRANT ALL ON TABLE public.admin_permissions TO service_role;


--
-- Name: TABLE admin_role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_role_permissions TO anon;
GRANT ALL ON TABLE public.admin_role_permissions TO authenticated;
GRANT ALL ON TABLE public.admin_role_permissions TO service_role;


--
-- Name: TABLE admin_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_roles TO anon;
GRANT ALL ON TABLE public.admin_roles TO authenticated;
GRANT ALL ON TABLE public.admin_roles TO service_role;


--
-- Name: TABLE admin_user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_user_roles TO anon;
GRANT ALL ON TABLE public.admin_user_roles TO authenticated;
GRANT ALL ON TABLE public.admin_user_roles TO service_role;


--
-- Name: TABLE ai_rule_parameters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_rule_parameters TO anon;
GRANT ALL ON TABLE public.ai_rule_parameters TO authenticated;
GRANT ALL ON TABLE public.ai_rule_parameters TO service_role;


--
-- Name: TABLE ai_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_rules TO anon;
GRANT ALL ON TABLE public.ai_rules TO authenticated;
GRANT ALL ON TABLE public.ai_rules TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE batch_upload_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.batch_upload_items TO anon;
GRANT ALL ON TABLE public.batch_upload_items TO authenticated;
GRANT ALL ON TABLE public.batch_upload_items TO service_role;


--
-- Name: TABLE batch_uploads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.batch_uploads TO anon;
GRANT ALL ON TABLE public.batch_uploads TO authenticated;
GRANT ALL ON TABLE public.batch_uploads TO service_role;


--
-- Name: TABLE beneficiaries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.beneficiaries TO anon;
GRANT ALL ON TABLE public.beneficiaries TO authenticated;
GRANT ALL ON TABLE public.beneficiaries TO service_role;


--
-- Name: TABLE beneficiary_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.beneficiary_documents TO anon;
GRANT ALL ON TABLE public.beneficiary_documents TO authenticated;
GRANT ALL ON TABLE public.beneficiary_documents TO service_role;


--
-- Name: TABLE case_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.case_categories TO anon;
GRANT ALL ON TABLE public.case_categories TO authenticated;
GRANT ALL ON TABLE public.case_categories TO service_role;


--
-- Name: TABLE case_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.case_files TO anon;
GRANT ALL ON TABLE public.case_files TO authenticated;
GRANT ALL ON TABLE public.case_files TO service_role;


--
-- Name: TABLE case_status_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.case_status_history TO anon;
GRANT ALL ON TABLE public.case_status_history TO authenticated;
GRANT ALL ON TABLE public.case_status_history TO service_role;


--
-- Name: TABLE case_updates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.case_updates TO anon;
GRANT ALL ON TABLE public.case_updates TO authenticated;
GRANT ALL ON TABLE public.case_updates TO service_role;


--
-- Name: TABLE cases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cases TO anon;
GRANT ALL ON TABLE public.cases TO authenticated;
GRANT ALL ON TABLE public.cases TO service_role;


--
-- Name: TABLE category_detection_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.category_detection_rules TO anon;
GRANT ALL ON TABLE public.category_detection_rules TO authenticated;
GRANT ALL ON TABLE public.category_detection_rules TO service_role;


--
-- Name: TABLE category_summary_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.category_summary_view TO anon;
GRANT ALL ON TABLE public.category_summary_view TO authenticated;
GRANT ALL ON TABLE public.category_summary_view TO service_role;


--
-- Name: TABLE cities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cities TO anon;
GRANT ALL ON TABLE public.cities TO authenticated;
GRANT ALL ON TABLE public.cities TO service_role;


--
-- Name: TABLE communications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.communications TO anon;
GRANT ALL ON TABLE public.communications TO authenticated;
GRANT ALL ON TABLE public.communications TO service_role;


--
-- Name: TABLE contribution_approval_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contribution_approval_status TO anon;
GRANT ALL ON TABLE public.contribution_approval_status TO authenticated;
GRANT ALL ON TABLE public.contribution_approval_status TO service_role;


--
-- Name: TABLE contributions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contributions TO anon;
GRANT ALL ON TABLE public.contributions TO authenticated;
GRANT ALL ON TABLE public.contributions TO service_role;


--
-- Name: TABLE contribution_latest_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contribution_latest_status TO anon;
GRANT ALL ON TABLE public.contribution_latest_status TO authenticated;
GRANT ALL ON TABLE public.contribution_latest_status TO service_role;


--
-- Name: TABLE fcm_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.fcm_tokens TO anon;
GRANT ALL ON TABLE public.fcm_tokens TO authenticated;
GRANT ALL ON TABLE public.fcm_tokens TO service_role;


--
-- Name: TABLE id_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.id_types TO anon;
GRANT ALL ON TABLE public.id_types TO authenticated;
GRANT ALL ON TABLE public.id_types TO service_role;


--
-- Name: TABLE landing_contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.landing_contacts TO anon;
GRANT ALL ON TABLE public.landing_contacts TO authenticated;
GRANT ALL ON TABLE public.landing_contacts TO service_role;


--
-- Name: TABLE landing_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.landing_stats TO anon;
GRANT ALL ON TABLE public.landing_stats TO authenticated;
GRANT ALL ON TABLE public.landing_stats TO service_role;


--
-- Name: TABLE localization; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.localization TO anon;
GRANT ALL ON TABLE public.localization TO authenticated;
GRANT ALL ON TABLE public.localization TO service_role;


--
-- Name: TABLE monthly_breakdown_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.monthly_breakdown_view TO anon;
GRANT ALL ON TABLE public.monthly_breakdown_view TO authenticated;
GRANT ALL ON TABLE public.monthly_breakdown_view TO service_role;


--
-- Name: TABLE nickname_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nickname_mappings TO anon;
GRANT ALL ON TABLE public.nickname_mappings TO authenticated;
GRANT ALL ON TABLE public.nickname_mappings TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE payment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_methods TO anon;
GRANT ALL ON TABLE public.payment_methods TO authenticated;
GRANT ALL ON TABLE public.payment_methods TO service_role;


--
-- Name: TABLE project_cycles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_cycles TO anon;
GRANT ALL ON TABLE public.project_cycles TO authenticated;
GRANT ALL ON TABLE public.project_cycles TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE push_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.push_subscriptions TO anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;


--
-- Name: TABLE recurring_contributions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recurring_contributions TO anon;
GRANT ALL ON TABLE public.recurring_contributions TO authenticated;
GRANT ALL ON TABLE public.recurring_contributions TO service_role;


--
-- Name: TABLE site_activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.site_activity_log TO anon;
GRANT ALL ON TABLE public.site_activity_log TO authenticated;
GRANT ALL ON TABLE public.site_activity_log TO service_role;


--
-- Name: TABLE site_activity_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.site_activity_summary TO anon;
GRANT ALL ON TABLE public.site_activity_summary TO authenticated;
GRANT ALL ON TABLE public.site_activity_summary TO service_role;


--
-- Name: TABLE sponsorships; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sponsorships TO anon;
GRANT ALL ON TABLE public.sponsorships TO authenticated;
GRANT ALL ON TABLE public.sponsorships TO service_role;


--
-- Name: TABLE storage_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_rules TO anon;
GRANT ALL ON TABLE public.storage_rules TO authenticated;
GRANT ALL ON TABLE public.storage_rules TO service_role;


--
-- Name: TABLE system_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_config TO anon;
GRANT ALL ON TABLE public.system_config TO authenticated;
GRANT ALL ON TABLE public.system_config TO service_role;


--
-- Name: TABLE system_content; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_content TO anon;
GRANT ALL ON TABLE public.system_content TO authenticated;
GRANT ALL ON TABLE public.system_content TO service_role;


--
-- Name: TABLE user_merge_backups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_merge_backups TO anon;
GRANT ALL ON TABLE public.user_merge_backups TO authenticated;
GRANT ALL ON TABLE public.user_merge_backups TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE visitor_activity_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.visitor_activity_summary TO anon;
GRANT ALL ON TABLE public.visitor_activity_summary TO authenticated;
GRANT ALL ON TABLE public.visitor_activity_summary TO service_role;


--
-- Name: TABLE visitor_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.visitor_sessions TO anon;
GRANT ALL ON TABLE public.visitor_sessions TO authenticated;
GRANT ALL ON TABLE public.visitor_sessions TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE messages_2026_02_23; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_23 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_23 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_24; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_24 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_24 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_25; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_25 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_25 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_26; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_26 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_26 TO dashboard_user;


--
-- Name: TABLE messages_2026_02_27; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_27 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_27 TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict Vt36YzhXTmgo9IUsTSwZCljfN62008Zvkyje1jWn4c2I3xucih4kelppasvBb5Z

