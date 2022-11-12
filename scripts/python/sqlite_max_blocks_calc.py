sqlite_max_int_ids = 9223372036854775807


blocks_per_houer = 20
blocks_per_day = blocks_per_houer * 24
blocks_per_year = blocks_per_day * 365
total_years_to_above_blocks = sqlite_max_int_ids / blocks_per_year
print(total_years_to_above_blocks)