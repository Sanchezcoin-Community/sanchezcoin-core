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