# Functional overview


## Value functions
Value functions are used to return a specific value, they cannot push values onto the stack

### get_unlocking_script_hash():
This function returns the hash of the unlocking script.

### get_locking_script_hash():
This function returns the hash of the locking script.

### get_last_block_hash():
Returns the hash of the last block.

### get_current_block_hight():
Returns the current block height.

### get_current_block_diff():
Returns the current block difficulty.

### verify_spfc_sig(signer:PublicKey, sign:Signature message:Digest):
This function checks if a special signature is valid and returns a boolean.

### get_total_signers():
This function returns the total number of all signatures.

### use_one_signer():
This function returns a boolean that indicates whether there is exactly 1 signature.

### swiftyH():

### pop_from_y():

### sha256d():

### sha3():