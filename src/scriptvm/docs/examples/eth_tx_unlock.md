# Exampels

## Unlocking with Ethereum Address

</br>

### Locking Skript:

```JavaScript
if(is_a_signer(EthAddress(0xac27b3da732a8753192ba3f9f90195c5922e7d0a)) == true) {
    verify_sig();
    exit();
}
```

</br>

### Unlocking Skript:


```JavaScript
add_verify_key(EthAddress(0xac27b3da732a8753192ba3f9f90195c5922e7d0a));
verify_sig();
exit();
```



### Console result:
```json
{
    pkeys: [
    {
        type: 'ethadr',
        pkey: '0xac27b3da732a8753192ba3f9f90195c5922e7d0a'
    }
    ],
    hashes: {
    unlock_script: '3ae7f8392c16a3f6c0ec15c651e87811e9653ae16c1f368d2047c0ae0aa98e2f',
    locking_script: '06b1b36c579bf7da360558b4051348d2215ca816a8d2dfc8051d958150a5a4b3'
    },
    unlocking_script_result: true,
    locking_script_result: true,
    total_unlocked: true,
    needed_sigs: 1,
    state: 'done'
}
```