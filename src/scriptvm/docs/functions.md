# **General**
**<font color="red">It should be noted that if an error occurs, the script will be marked as faulty and aborted. This applies to emit as well as value functions.</font>**

# **Emit functions**
Emit functions are able to push data onto the Y stack. If an Emit function does not return True, the script is aborted at this point.

### **add_verify_key_and_eq_verfiy_signature(pkey) -> emit:**
This function adds a public key to the `VerifyerWhiteList`.<br>
After the key has been added, it is checked whether the signature of the added key is correct, if not the script is aborted with a false.
#### **Parameters:**
- pkey = This is either a public key or an address
#### **Functional Rules:**
```
1) It is checked whether there is already a public key on the VerifyerWhiteList.
    -> There is already a public key on the VerifyWhiteList: The script is aborted
2) It is checked whether there is a suitable signature for the public key used.
    -> There is no matching signature: The script will be aborted
    -> The signature is incorrect: the script will be aborted.
3) The unlock function is executed, the script is valid up to this point and can be used.
```


### **add_verify_key(pkey) -> emit:**
This function adds a public key to the `VerifyerWhiteList`.<br>
If a key is already in the `VerifyerWhiteList`, the script is aborted with a false.
#### **Parameters:**
- pkey = This is either a public key or an address
#### **Functional Rules:**
```
1) It is checked whether there is already a public key on the VerifyerWhiteList.
    -> There is already a public key on the VerifyWhiteList: The script is aborted
```


### **abort() -> emit:**
- Aborts the script and returns false.
#### **Parameters:**
- **This function has no parameters**


### **verify_sig() -> emit:**
This function verifies the signatures.<br>
If one of the signatures is not valid, the process is aborted.
#### **Parameters:**
- **This function has no parameters**
#### **Functional Rules:**
```
1) It is checked whether there are N signatures.
    -> There are not enough signatures / PubicKeys available: The script is marked as invalid and aborted.
2) The signatures are checked for validity using the public key.
    -> The signatures are not correct: The script is marked as faulty and is aborted.
```


### **block_nft() -> emit:**
This function prevents the transmission of NFTs.<br>
If this function is called, the script will be marked as invalid as soon as an attempt is made to transfer an NFT.
#### **Parameters:**
- **This function has no parameters**
#### **Functional Rules:**
```
1) It is checked whether an NftCommitment hash is available.
    -> There is no NFT commitment hash, the script is marked as invalid and aborted.
```


### **push_to_y(item) -> emit:**
This function adds an arbitrary value to the stack.
#### **Parameters:**
- item = Specifies a legal object to be pushed onto the Y stack


### **set_n_of_m(int_value) -> emit:**
Determines how many signatures are required at least to unlock this script.<br>
If less than 1 signature or more than signatures are used, the script is marked as invalid and aborted.
#### **Parameters:**
- int_value = Specifies the required number of signatures required
#### **Functional Rules:**
```
1) Checks whether int value is greater than or equal to 0 and less than or equal to 16.
    -> The specified number does not meet the required conditions: The script is marked as invalid and aborted.
```

### **unlock() -> emit:**
Signals that this is a valid script and the output may be used.<br>
If an error occurs in the script after calling this function, this script is marked as invalid and aborted.
#### **Parameters:**
- **This function has no parameters**
#### **Functional Rules:**
```
1) It is checked whether StatesUnlocked has already been set to True.
    -> StateUnlocked is already set to true: The script is marked as faulty and aborted.
```

### **exit() -> emit:**
Exits the script gracefully, no more status changes are made, the script exits as is.
#### **Parameters:**
- **This function has no parameters**



# **Value functions**
**Value functions are used to return a specific value, they cannot push values onto the stack.**


### **get_unlocking_script_hash() -> hash:**
> This function returns the hash of the unlocking script.


### **get_locking_script_hash() -> hash:**
> This function returns the hash of the locking script.


### **get_last_block_hash() -> hash:**
> Returns the hash of the last block.


### **get_current_block_hight() -> uint256:**
> Returns the current block height.


### **get_current_block_diff() -> uint256:**
> Returns the current block difficulty.


### **verify_spfc_sig(signer_pkey, sig, message) -> bool:**
#### **Parameters:**
- signer_pkey = Specifies the public key / address to use to verify that the signature is correct.
- message = Specifies the message that was signed.
- sig = Specifies the signature to be checked.
> Returns a boolean indicating whether the signature is correct.


### **get_total_signers() -> int:**
> This function returns the total number of all signatures.


### **use_one_signer() -> bool:**
> This function returns a boolean that indicates whether there is exactly 1 signature.


### **swiftyH(...items) -> hash:**
#### **Parameters:**
- items = Specifies the data used to be hashed.
> Generates a swifty hash from the given parameters.


### **pop_from_y(...items) -> hash:**
#### **Parameters:**
- items = Specifies the data used to be hashed.
> Removes the first value from Y stack and returns that value.


### **sha256d(...items) -> hash:**
#### **Parameters:**
- items = Specifies the data used to be hashed.
> Generates and returns a duplicate SHA256 hash.


### **sha3(...items) -> hash:**
#### **Parameters:**
- items = Specifies the data used to be hashed.
> Generates and returns a SHA3-256 hash.