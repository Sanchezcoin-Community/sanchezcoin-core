# Exampels

## Unlocking with Ethereum Address

</br>

### Locking Skript:

```JavaScript
if(use_one_signer() === true) {
    if(eq_signers(EthAddress(0xac27b3da732a8753192ba3f9f90195c5922e7d0a)) == true) {
        unlock();
        exit();
    }
}
```

</br>

### Unlocking Skript:


```JavaScript
push_verify_address(EthAddress(0xac27b3da732a8753192ba3f9f90195c5922e7d0a));
verify_sig();
unlock();
exit();
```