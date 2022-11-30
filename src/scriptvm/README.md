## ConditionsScript

### Unlocking script
```
add_verify_key_and_eq_verfiy_signature(
    PublicKey(
        curve25519,
        32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57
     )
);
```

### Locking script
```
if(#unlocking_script_hash == 49391212bcf6a4b6fad075b44caefc74465979d0afe5298095d32f14679bf2a9) {
    unlock();
}
```