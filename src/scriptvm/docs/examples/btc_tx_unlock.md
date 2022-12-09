# Exampels

## Unlocking with Bitcoin (P2WPKH) Address

</br>

### Locking Skript:

```JavaScript
if(is_a_signer(BtcAddress(bc1q76awjp3nmklgnf0yyu0qncsekktf4e3qj248t4)) == true) {
    verify_sig();
    exit();
}
```

</br>

### Unlocking Skript:


```JavaScript
add_verify_key(BtcAddress(bc1q76awjp3nmklgnf0yyu0qncsekktf4e3qj248t4));
verify_sig();
exit();
```


### Console result:
```json
{
    pkeys: [
    {
        type: 'p2wpkh',
        pkey: 'bc1q76awjp3nmklgnf0yyu0qncsekktf4e3qj248t4'
    }
    ],
    hashes: {
    unlock_script: '8e3b954c4d417d93409c9eb5f5679ef63cd07012ed6b8fa7f2d1b6364dab52ae',
    locking_script: '766dd16aacc6584ddf9a758182c1531cac15c72372d422665710a1f23201a108'
    },
    unlocking_script_result: true,
    locking_script_result: true,
    total_unlocked: true,
    needed_sigs: 1,
    state: 'done'
}
```