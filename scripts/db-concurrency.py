"""Local, synthetic-fixture concurrency regression. No remote credentials or URLs."""
from pathlib import Path
import subprocess
import time

if Path('supabase/.temp/project-ref').exists():
    raise RuntimeError('Use an unlinked local checkout.')

PSQL = ['docker', 'exec', '-i', 'supabase_db_duzelo', 'psql', '--no-psqlrc', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1']
WORKER = '30000000-0000-0000-0000-000000000002'
PUBLISH = f"select private.publish_worker_card('{WORKER}','40000000-0000-0000-0000-000000000001','Fictional test worker','Synthetic database test profile.');"

def query(sql):
    return subprocess.run(PSQL, input=sql, text=True, capture_output=True, check=True).stdout.strip()

def restore():
    query(f"update public.worker_profiles set status='approved' where id='{WORKER}';" + PUBLISH)

def await_lock():
    for _ in range(30):
        if query("select exists(select 1 from pg_locks where locktype='advisory' and granted);") == 't':
            return
        time.sleep(0.05)
    raise RuntimeError('Publication lock was not observed.')

def run_race(leader_sql, follower_sql, should_fail):
    leader = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        leader.stdin.write(leader_sql)
        leader.stdin.close()
        leader.stdin = None
        await_lock()
        follower = subprocess.run(PSQL, input=follower_sql, text=True, capture_output=True, timeout=15)
        _, errors = leader.communicate(timeout=15)
        assert leader.returncode == 0, errors
        if should_fail:
            assert follower.returncode != 0 and 'requires reviewed identity' in follower.stderr, follower.stderr
        else:
            assert follower.returncode == 0, follower.stderr
        assert query('select count(*) from public.worker_cards;') == '0'
    finally:
        if leader.poll() is None:
            leader.terminate()
            leader.wait(timeout=5)

try:
    restore()
    run_race(f"begin; update public.worker_profiles set status='suspended' where id='{WORKER}'; select pg_sleep(2); commit;", PUBLISH, True)
    print('PASS: publication waits for revocation and rejects stale eligibility.')
    restore()
    run_race('begin; ' + PUBLISH + ' select pg_sleep(2); commit;', f"update public.worker_profiles set status='suspended' where id='{WORKER}';", False)
    print('PASS: revocation waits for publication, then removes the committed card.')
finally:
    restore()
