import hashlib


start_block_reward = 800
reward_interval = 110700
periods = 1

def max_money():
    global periods
    current_reward = start_block_reward * (10**8)
    total = 0
    while current_reward > 0:
        total += int(reward_interval * current_reward)
        #print('Period', periods, current_reward, total, "{:.8f}".format(total / 100000000))
        current_reward = int(current_reward / 2)
        periods += 1
    return total

# 179.769.313,486 Mortys
mx = max_money()
newer_method_string = "{:.8f}".format(mx / 100000000)
print(newer_method_string, 'Mortys')
print(mx)