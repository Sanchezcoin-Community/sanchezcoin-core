start_block_reward = 130000
reward_interval = 672
periods = 1

def max_money():
    global periods
    current_reward = start_block_reward * (10**8)
    total = 0
    while current_reward > 0:
        total += reward_interval * current_reward
        current_reward /= 2
        periods += 1
    return total

# 179.769.313,486 Mortys
mx = max_money()
newer_method_string = "{:.8f}".format(mx / 100000000)
print(newer_method_string, "Mortys =", int(mx), 'Jerrys')
print('Total Halvening Periods =', periods)