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



print(len(bytes.fromhex('0100000000000000000000000000000000000000000000000000000000000000000000008eca5f35de5a186808cd7407e20b70bddad57cbc52b864b9c8bc0fd0976d35b2ebe068171e00ffff7042af2a')))
print(len(bytes.fromhex('010000003af46cdea78cff76de3b2ef056322a30170738e8001dd170f91d566d7ff6d8618eca5f35de5a186808cd7407e20b70bddad57cbc52b864b9c8bc0fd0976d35b20d8670171e00ffff54c10100')))