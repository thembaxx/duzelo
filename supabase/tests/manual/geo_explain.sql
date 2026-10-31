-- Run after local migration reset with real fictional test fixtures loaded.
-- EXPLAIN is for operator inspection; a small data set may use sequential scan.
-- Do not confuse plan existence with a performance guarantee.
explain (analyze, buffers, verbose)
select wc.worker_id
from private.worker_coverage wc
where extensions.ST_DWithin(
 wc.base_point,
 extensions.ST_SetSRID(extensions.ST_MakePoint(30.8,-27.0),4326)::extensions.geography,
 20000
);
