-- Synthetic fixtures only; server-side planning evidence, not an enabled matching API.
-- Prefilter by bounded maximum radius to use GIST, then exact per-worker radius.
explain (analyze, buffers)
select c.worker_id
from private.worker_coverage c
where extensions.st_dwithin(c.base_point,
  extensions.st_setsrid(extensions.st_makepoint(30.002,-27.002),4326)::extensions.geography, 150000)
  and extensions.st_dwithin(c.base_point,
  extensions.st_setsrid(extensions.st_makepoint(30.002,-27.002),4326)::extensions.geography, c.radius_km*1000);
-- Tiny test tables can rationally use sequential scans. Prove index eligibility
-- separately without claiming this forced plan is a production benchmark.
set enable_seqscan = off;
explain (analyze, buffers)
select c.worker_id from private.worker_coverage c
where extensions.st_dwithin(c.base_point,
  extensions.st_setsrid(extensions.st_makepoint(30.002,-27.002),4326)::extensions.geography, 150000);
reset enable_seqscan;
