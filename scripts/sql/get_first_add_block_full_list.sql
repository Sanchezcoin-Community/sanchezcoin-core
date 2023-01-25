SELECT 
	b.block_id,
	a.block_id,
	a.block_hash,
	b.block_hash
FROM blocks b
LEFT JOIN blocks a ON a.block_hash = b.prev_hash
WHERE b.block_id > a.block_id or a.block_id is NULL
GROUP BY a.prev_hash
ORDER BY a.block_id DESC, b.block_id ASC LIMIT 1
