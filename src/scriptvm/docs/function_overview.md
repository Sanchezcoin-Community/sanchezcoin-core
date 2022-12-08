# Functional overview


## Value functions
Value functions are used to return a specific value, they cannot push values onto the stack.

</br>

### get_unlocking_script_hash() -> hash
This function returns the hash of the unlocking script.

</br>

### get_locking_script_hash() -> hash
This function returns the hash of the locking script.

</br>

### get_last_block_hash() -> hash
Returns the hash of the last block.

</br>

### get_current_block_hight() -> uint256
Returns the current block height.

</br>

### get_current_block_diff() -> uint256
Returns the current block difficulty.

</br>

### verify_spfc_sig(signer:PublicKey, sign:Signature message:Digest) -> bool
This function checks if a special signature is valid and returns a boolean.

</br>

### get_total_signers() -> int
This function returns the total number of all signatures.

</br>

### use_one_signer() -> bool
This function returns a boolean that indicates whether there is exactly 1 signature.

</br>

### swiftyH(...items) -> hash
Generates a swifty hash from the given parameters.

</br>

### pop_from_y(...items) -> hash
Removes the first value from Y stack and returns that value.

</br>

### sha256d(...items) -> hash
Generates and returns a duplicate SHA256 hash.

</br>

### sha3(...items) -> hash
Generates and returns a SHA3-256 hash.