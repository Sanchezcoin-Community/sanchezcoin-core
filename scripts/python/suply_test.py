import hashlib


start_block_reward = 2500
reward_interval = 210000*2
periods = 1

def max_money():
    global periods
    current_reward = start_block_reward * (10**8)
    total = 0
    print()
    while current_reward > 0:
        total += int(reward_interval * current_reward)
        print('Period', periods, total / 100000000)
        current_reward = int(current_reward / 2)
        periods += 1
    print()
    return total

# 179.769.313,486 Mortys
mx = max_money()
newer_method_string = "{:.8f}".format( round(float(mx)) / 100000000)
rc = float(newer_method_string)/1000000000
print(rc, 'mrd Sanchez')