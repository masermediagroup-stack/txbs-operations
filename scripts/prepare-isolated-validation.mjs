// Local A-08R experiment only. This script has no hosted connection or apply mode.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
if (args[0] !== '--worker') {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--worker', ...args], {
    timeout: 90000, stdio: 'inherit', windowsHide: true,
  });
  if (child.error) console.error(child.error.message);
  process.exit(child.status ?? 1);
}
const [toolsDirectory, outputDirectory, pg17Directory] = args.slice(1);
assert(toolsDirectory && outputDirectory && (args.length === 3 || args.length === 4),
  'Usage: node scripts/prepare-isolated-validation.mjs <isolated-tools-workspace> <new-output-directory> [qualified-pg17-workspace]');
const repository = fileURLToPath(new URL('../', import.meta.url));
process.chdir(repository);
const output = path.resolve(outputDirectory);
const relativeOutput = path.relative(repository, output);
assert(relativeOutput.startsWith('..' + path.sep) || path.isAbsolute(relativeOutput),
  'Keep generated candidate SQL and evidence outside the application repository');
assert(!fs.existsSync(output), 'Use a new output directory; never overwrite prior evidence');
const require = createRequire(import.meta.url);
const toolsRequire = createRequire(path.join(path.resolve(toolsDirectory), 'package.json'));
function packageMetadata(resolver, name, entry = name) {
  let directory = path.dirname(resolver.resolve(entry));
  while (directory !== path.dirname(directory)) {
    const filename = path.join(directory,'package.json');
    if (fs.existsSync(filename)) {
      const metadata = JSON.parse(fs.readFileSync(filename,'utf8'));
      if (metadata.name === name) return metadata;
    }
    directory = path.dirname(directory);
  }
  throw Error('Cannot identify package: '+name);
}
assert.equal(packageMetadata(require,'@electric-sql/pglite').version, '0.5.8');
assert.equal(packageMetadata(toolsRequire,'@electric-sql/pglite-tools','@electric-sql/pglite-tools/pg_dump').version, '0.4.8');
assert.equal(packageMetadata(toolsRequire,'@electric-sql/pglite').version, '0.5.8');
const toolsLock = JSON.parse(fs.readFileSync(path.join(toolsDirectory, 'package-lock.json'), 'utf8'));
assert.equal(toolsLock.packages['node_modules/@electric-sql/pglite-tools'].integrity,
  'sha512-WjgS8US6xfuE0wLYn5m9WrZ/+8dQWoQuQSRkpe7eYcxxx1UjZjvq30rpYSHfGrGtTke/zNiCd9ijVGeRUD8ukg==');
const { pgDump } = await import(pathToFileURL(toolsRequire.resolve('@electric-sql/pglite-tools/pg_dump')));
const { PGlite } = require('@electric-sql/pglite');
const { createTestDatabase } = await import('../tests/helpers/database.ts');
let targetEngine;
let pg17Lock;
if (pg17Directory) {
  const pg17Require = createRequire(path.join(path.resolve(pg17Directory),'package.json'));
  assert.equal(packageMetadata(pg17Require,'@electric-sql/pglite').version,'0.4.6');
  pg17Lock = fs.readFileSync(path.join(pg17Directory,'package-lock.json'));
  assert.equal(JSON.parse(pg17Lock).packages['node_modules/@electric-sql/pglite'].integrity,
    'sha512-qmlmfN8UyKCee35qkV0r/MBp+Znl8FjBz7OpoglNvww3GJpw0/DLP0o1ZymvLNmcD5DTLOQdzKPtF8Hd3mdl1w==');
  targetEngine = {PGlite:pg17Require('@electric-sql/pglite').PGlite,
    pgcrypto:pg17Require('@electric-sql/pglite/contrib/pgcrypto').pgcrypto};
}
const hash = value => createHash('sha256').update(value).digest('hex');
const quoteIdentifier = value => '"' + value.replaceAll('"', '""') + '"';
const quoteLiteral = value => "'" + value.replaceAll("'", "''") + "'";
const expectedStoragePolicies = [
  'operational_evidence_immutable_delete', 'operational_evidence_immutable_update',
  'operational_media_delete', 'operational_media_insert', 'operational_media_select',
  'operational_media_tech_insert', 'operational_media_tech_own_select', 'operational_media_update',
];
const expectedBucket = {
  id: 'operational-media', name: 'operational-media', public: false, file_size_limit: 15728640,
  allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
};

// These are explicitly minimal local platform stubs, never part of candidate SQL.
const platformScaffold = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb,unique(bucket_id,name));
  alter table storage.objects enable row level security;
  grant usage on schema public,auth,storage to anon,authenticated,service_role;
  grant all on storage.objects to authenticated;
`;

const queries = {
  schemas: `select nspname,array(select x::text from unnest(coalesce(nspacl,acldefault('n',nspowner))) x order by x::text) as acl from pg_namespace where nspname in ('public','private') order by 1`,
  relations: `select n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,
    array(select x::text from unnest(coalesce(c.relacl,acldefault('r',c.relowner))) x order by x::text) as acl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','v','m','S') order by 1,2`,
  columns: `select n.nspname,c.relname,a.attname,a.attnum,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) as default_expression,
    a.attcollation::regcollation::text as collation,a.attacl
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
    where n.nspname in ('public','private') and c.relkind in ('r','v','m') and a.attnum>0 and not a.attisdropped order by 1,2,4`,
  enums: `select n.nspname,t.typname,e.enumlabel,e.enumsortorder from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','private') order by 1,2,4`,
  functions: `select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition,
    array(select x::text from unnest(coalesce(p.proacl,acldefault('f',p.proowner))) x order by x::text) as acl
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')
    and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e') order by 1,2,3`,
  constraints: `select n.nspname,c.relname,k.conname,k.contype,k.condeferrable,k.condeferred,k.convalidated,pg_get_constraintdef(k.oid,false) as definition
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') order by 1,2,3`,
  indexes: `select n.nspname,c.relname,i.relname as index_name,pg_get_indexdef(x.indexrelid) as definition,x.indisvalid,x.indisready
    from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') order by 1,2,3`,
  policies: `select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','private','storage') order by 1,2,3`,
  triggers: `select n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,false) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('auth','public','private','storage') order by 1,2,3`,
  views: `select n.nspname,c.relname,pg_get_viewdef(c.oid,false) as definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('v','m') order by 1,2`,
  defaultPrivileges: `select r.rolname,n.nspname,d.defaclobjtype,array(select x::text from unnest(d.defaclacl) x order by x::text) as acl from pg_default_acl d join pg_roles r on r.oid=d.defaclrole left join pg_namespace n on n.oid=d.defaclnamespace order by 1,2,3`,
};
async function catalog(db) {
  await db.exec("select set_config('search_path','',false)");
  const result = {};
  for (const [name, query] of Object.entries(queries)) result[name] = (await db.query(query)).rows;
  return result;
}
async function rowCounts(db) {
  const tables = (await db.query(`select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','private') order by 1,2`)).rows;
  tables.push({nspname:'auth',relname:'users'},{nspname:'storage',relname:'objects'});
  const counts = [];
  for (const table of tables) {
    const name = `${quoteIdentifier(table.nspname)}.${quoteIdentifier(table.relname)}`;
    const count = Number((await db.query(`select count(*)::text as count from ${name}`)).rows[0].count);
    assert.equal(count,0,'Unexpected data in ' + name);
    counts.push({table:name,count});
  }
  return counts;
}

async function securityProbes(db) {
  const rollback = new Error('Roll back all synthetic security-probe rows');
  const checks = [];
  const ids = ['11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000004'];
  const site = '22000000-0000-4000-8000-000000000001';
  const project = '33000000-0000-4000-8000-000000000001';
  const assignment = '44000000-0000-4000-8000-000000000001';
  try {
    await db.transaction(async tx=>{
      for (const id of ids) await tx.query('insert into auth.users(id,email) values ($1,$2)',[id,id+'@test.invalid']);
      assert.equal(Number((await tx.query('select count(*) as count from public.profiles where active=false')).rows[0].count),4);
      checks.push('Signup trigger creates inactive profiles');
      for (let i=0;i<ids.length;i++) await tx.query('update public.profiles set active=$2,system_role=$3::public.app_role where id=$1',[ids[i],i!==3,i===0?'Operator':'Tech']);
      await tx.query("insert into public.sites(id,slug,name) values ($1,'synthetic-site','Synthetic site')",[site]);
      await tx.query("insert into public.site_memberships(site_id,user_id,role) values ($1,$2,'Operator')",[site,ids[0]]);
      await tx.query("insert into public.projects(id,site_id,slug,name,status,created_at,updated_at) values ($1,$2,'synthetic-project','Synthetic project','Stored',now(),now())",[project,site]);
      await tx.query("insert into public.field_assignments(id,site_id,project_id,assigned_tech_id,assigned_tech_name,assigned_by_user_id,assigned_by_name) values ($1,$2,$3,$4,'Synthetic Tech',$5,'Synthetic Operator')",[assignment,site,project,ids[1],ids[0]]);
      async function probe(name,role,id,sql,expectedRows,errorCode) {
        await tx.exec('savepoint role_probe');
        try {
          await tx.exec('set local role '+quoteIdentifier(role));
          await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id ?? '']);
          let failure;
          let result;
          try { result=await tx.query(sql); } catch(error) { failure=error; }
          if (errorCode) assert.equal(failure?.code,errorCode,name);
          else { assert.equal(failure,undefined,name); assert.equal(result.rows.length,expectedRows,name); }
          checks.push(name);
        } finally { await tx.exec('rollback to savepoint role_probe; release savepoint role_probe'); }
      }
      await probe('Anonymous table access denied','anon',null,'select id from public.field_assignments',null,'42501');
      await probe('Active Operator sees assignment','authenticated',ids[0],'select id from public.field_assignments',1);
      await probe('Assigned active Tech sees assignment','authenticated',ids[1],'select id from public.field_assignments',1);
      await probe('Unassigned active Tech sees no assignment','authenticated',ids[2],'select id from public.field_assignments',0);
      await probe('Inactive Tech sees no assignment','authenticated',ids[3],'select id from public.field_assignments',0);
      await probe('Inactive snapshot RPC denied','authenticated',ids[3],'select public.get_field_work_snapshot_v1()',null,'42501');
      await probe('Client evidence attestation denied','authenticated',ids[0],"select public.verify_staged_upload('55000000-0000-4000-8000-000000000001',$$"+ids[0]+"$$,'synthetic',1)",null,'42501');
      for (const signature of ['public.claim_receipt_notifications_v1(uuid)','public.finish_receipt_notification_v1(uuid,text,text,text)']) {
        for (const role of ['anon','authenticated','service_role']) {
          assert.equal((await tx.query('select has_function_privilege($1,$2,\'EXECUTE\') as allowed',[role,signature])).rows[0].allowed,role==='service_role');
          checks.push(role+' worker privilege '+signature);
        }
      }
      throw rollback;
    });
  } catch(error) { if (error!==rollback) throw error; }
  return checks;
}

fs.mkdirSync(output);
let reference;
let compatibilityReference;
const targets = [];
try {
  reference = await createTestDatabase();
  const version = (await reference.query('select version() as version')).rows[0].version;
  const expectedCatalog = await catalog(reference);
  let expectedRestoreCatalog = expectedCatalog;
  let restoreVersion = version;
  if (targetEngine) {
    compatibilityReference = await createTestDatabase(targetEngine);
    restoreVersion = (await compatibilityReference.query('select version() as version')).rows[0].version;
    assert.equal((await compatibilityReference.query('show server_version_num')).rows[0].server_version_num,'170005');
    expectedRestoreCatalog = await catalog(compatibilityReference);
  }
  // Tools 0.4.8 restores SHOW search_path as SQL; an empty setting is invalid
  // in that wrapper. Use the ordinary explicit schema before invoking it.
  await reference.exec('set search_path = public');
  const raw = await (await pgDump({pg:reference,args:['--schema-only','--schema=public','--schema=private','--no-owner','--no-comments']})).text();
  // A single exact compatibility change: the platform already supplies public.
  // Do not use DROP SCHEMA or a general SQL/DML regex filter.
  assert.equal(raw.split('\nCREATE SCHEMA public;\n').length,2);
  const schema = raw.replace('\nCREATE SCHEMA public;\n','\n-- Existing platform public schema is retained.\n');
  assert(!raw.includes('Type: TABLE DATA;') && !raw.includes('Type: SEQUENCE SET;'));
  const policies = expectedCatalog.policies.filter(p=>p.schemaname==='storage');
  assert.deepEqual(policies.map(p=>p.policyname),expectedStoragePolicies);
  const authTriggers = expectedCatalog.triggers.filter(t=>t.nspname==='auth');
  assert.equal(authTriggers.length,1);
  assert.equal(authTriggers[0].tgname,'on_auth_user_created');
  assert.equal(authTriggers[0].tgenabled,'O');
  const bucketRows = (await reference.query('select id,name,public,file_size_limit,allowed_mime_types from storage.buckets order by id')).rows;
  assert.deepEqual(bucketRows,[expectedBucket]);
  const overlay = [
    '-- App-owned additions to existing platform objects. No Auth or object rows.',
    authTriggers[0].definition + ';',
    ...policies.map(p=>{
      assert.equal(p.tablename,'objects');
      assert(['PERMISSIVE','RESTRICTIVE'].includes(p.permissive));
      assert(['ALL','SELECT','INSERT','UPDATE','DELETE'].includes(p.cmd));
      assert.deepEqual(p.roles,['authenticated']);
      return `CREATE POLICY ${quoteIdentifier(p.policyname)} ON storage.objects AS ${p.permissive} FOR ${p.cmd} TO authenticated` +
        (p.qual ? ` USING (${p.qual})` : '') + (p.with_check ? ` WITH CHECK (${p.with_check})` : '') + ';';
    }),
    '-- The sole permitted configuration row is an empty private evidence bucket.',
    `INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES (${quoteLiteral(expectedBucket.id)},${quoteLiteral(expectedBucket.name)},false,${expectedBucket.file_size_limit},ARRAY[${expectedBucket.allowed_mime_types.map(quoteLiteral).join(',')}]);`,
  ].join('\n\n') + '\n';
  // pg_dump changes session settings (including row_security=off). Reset them
  // before any role/API checks in a connection that remains alive after restore.
  const candidate = schema + '\n' + overlay + '\nRESET ALL;\n';
  fs.writeFileSync(path.join(output,'candidate-application-schema.sql'),candidate,{flag:'wx'});
  fs.writeFileSync(path.join(output,'reference-catalog.json'),JSON.stringify(expectedCatalog,null,2),{flag:'wx'});
  fs.writeFileSync(path.join(output,'catalog-queries.json'),JSON.stringify(queries,null,2),{flag:'wx'});
  if (targetEngine) fs.writeFileSync(path.join(output,'pg17-reference-catalog.json'),JSON.stringify(expectedRestoreCatalog,null,2),{flag:'wx'});
  const proofs = [];
  for (let index=1;index<=2;index++) {
    const db = new (targetEngine?.PGlite ?? PGlite)();
    targets.push(db);
    await db.exec(platformScaffold);
    await db.exec(candidate);
    assert.equal((await db.query('show row_security')).rows[0].row_security,'on');
    const actual = await catalog(db);
    fs.writeFileSync(path.join(output,`restored-catalog-${index}.json`),JSON.stringify(actual,null,2),{flag:'wx'});
    for (const name of Object.keys(queries)) assert.deepEqual(actual[name],expectedRestoreCatalog[name],`Catalog mismatch: ${name}, restore ${index}`);
    const rows = await rowCounts(db);
    assert.deepEqual((await db.query('select id,name,public,file_size_limit,allowed_mime_types from storage.buckets order by id')).rows,[expectedBucket]);
    const securityChecks = await securityProbes(db);
    await rowCounts(db); // All probe identities and records must roll back.
    proofs.push({restore:index,catalogSha256:hash(JSON.stringify(actual)),zeroRowTables:rows,securityChecks});
  }
  // Demonstrate why target default ACL review is mandatory: a dump's explicit
  // source grants do not revoke privileges inherited from a different target.
  const poisoned = new (targetEngine?.PGlite ?? PGlite)();
  targets.push(poisoned);
  await poisoned.exec(platformScaffold);
  await poisoned.exec('alter default privileges in schema public grant all on tables to anon');
  await poisoned.exec(candidate);
  const poisonedCatalog = await catalog(poisoned);
  assert.notDeepEqual(poisonedCatalog.relations,expectedRestoreCatalog.relations);
  assert.equal((await poisoned.query("select has_table_privilege('anon','public.profiles','SELECT') as allowed")).rows[0].allowed,true);
  let platformGuardProof = null;
  if (targetEngine) {
    const guard=fs.readFileSync('supabase/bootstrap/isolated-validation-platform-guard.sql','utf8');
    // Required preflight rejection: never apply a fresh baseline over app data.
    let rejected=false;
    try { await poisoned.exec(guard); } catch(error) { rejected=error.code==='P0001'; }
    assert(rejected,'Platform guard failed to reject an existing application schema');
    const platform = new targetEngine.PGlite();
    targets.push(platform);
    await platform.exec(platformScaffold);
    await platform.exec(`create table auth.identities(id uuid); create table auth.sessions(id uuid);
      alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges for role postgres in schema public grant all on functions to anon,authenticated,service_role;
      alter default privileges for role postgres in schema public grant all on sequences to anon,authenticated,service_role;`);
    await platform.exec(guard+'\n'+candidate);
    const platformCatalog=await catalog(platform);
    for(const name of Object.keys(queries).filter(n=>n!=='defaultPrivileges'))
      assert.deepEqual(platformCatalog[name],expectedRestoreCatalog[name],'Normalized platform catalog mismatch: '+name);
    const unexpectedDefaults=await platform.query(`select count(*)::integer as count from pg_default_acl d
      cross join lateral aclexplode(d.defaclacl) a where d.defaclnamespace='public'::regnamespace
      and a.grantee in ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)`);
    assert.equal(unexpectedDefaults.rows[0].count,0);
    const securityChecks=await securityProbes(platform);
    await rowCounts(platform);
    const roleScript=fs.readFileSync('supabase/bootstrap/verify-isolated-validation-roles.sql','utf8');
    const roleResults=await platform.exec(roleScript);
    const roleProof=roleResults.find(r=>r.rows?.[0]?.role_proof)?.rows[0].role_proof;
    assert.equal(roleProof?.passed,32,'Rollback role script did not return all expected checks');
    await rowCounts(platform);
    fs.writeFileSync(path.join(output,'normalized-platform-catalog.json'),JSON.stringify(platformCatalog,null,2),{flag:'wx'});
    platformGuardProof={sha256:hash(guard),existingApplicationRejected:true,
      unexpectedPublicDefaultGrants:0,securityChecks,zeroRowTables:37,
      roleScriptSha256:hash(roleScript),roleScriptChecks:roleProof.passed};
  }
  const migrations = fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort().map(name=>({name,sha256:hash(fs.readFileSync('supabase/migrations/'+name))}));
  const git = spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000,windowsHide:true});
  assert.equal(git.status,0,'Cannot record source commit');
  const results = {
    status:'LOCAL_CANDIDATE_ONLY',node:process.version,postgres:version,
    restorePostgres:restoreVersion,pg17ToolsLockSha256:pg17Lock?hash(pg17Lock):null,
    sourceCommit:git.stdout.trim(),scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    helperSha256:hash(fs.readFileSync('tests/helpers/database.ts')),
    toolsLockSha256:hash(fs.readFileSync(path.join(toolsDirectory,'package-lock.json'))),
    tools:'@electric-sql/pglite-tools@0.4.8',pglite:'0.5.8',
    rawDumpSha256:hash(raw),candidateSha256:hash(candidate),candidateBytes:Buffer.byteLength(candidate),
    schemaCounts:Object.fromEntries(Object.entries(expectedCatalog).map(([key,rows])=>[key,rows.length])),
    restoreSchemaCounts:Object.fromEntries(Object.entries(expectedRestoreCatalog).map(([key,rows])=>[key,rows.length])),
    overlay:{authTriggers:1,storagePolicies:policies.length,buckets:1,storageObjects:0},migrations,proofs,
    negativeControl:{unexpectedTargetDefaultAclDetected:true,hostedApplyStillRequiresAclReview:true},
    platformGuardProof,
    limitations:[targetEngine?'Local PostgreSQL 17.5 is not the exact hosted PostgreSQL 17.11 service.':'Local PostgreSQL 18 does not establish compatibility with hosted PostgreSQL 17.',
      'Auth/Storage schemas are simplified local stubs; no hosted service or session was tested.',
      'Hosted schema ownership, default ACLs, extension schemas and platform policies require separate review.',
      'No remote apply mode; fresh identities, fixtures, deployment and replay acceptance remain outstanding.'],
  };
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:results.status,candidateSha256:results.candidateSha256,
    catalogSha256:proofs[0].catalogSha256,restores:proofs.length,
    zeroRowTablesPerRestore:proofs[0].zeroRowTables.length,
    securityChecksPerRestore:proofs[0].securityChecks.length,
    negativeControl:results.negativeControl}));
} catch (error) {
  fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({message:error.message,code:error.code,query:error.query},null,2),{flag:'wx'});
  console.error(error.code ?? error.name,error.message);
  process.exitCode=1;
} finally {
  for (const db of targets) await db.close();
  await compatibilityReference?.close();
  await reference?.close();
}
