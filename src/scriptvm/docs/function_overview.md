# Functional overview


## Value functions
Value functions are used to return a specific value, they cannot push values onto the stack.


### get_unlocking_script_hash() -> hash
This function returns the hash of the unlocking script.


### get_locking_script_hash() -> hash
This function returns the hash of the locking script.


### get_last_block_hash() -> hash
Returns the hash of the last block.


### get_current_block_hight() -> uint256
Returns the current block height.


### get_current_block_diff() -> uint256
Returns the current block difficulty.


### verify_spfc_sig(signer:PublicKey, sign:Signature message:Digest) -> bool
This function checks if a special signature is valid and returns a boolean.


### get_total_signers() -> int
This function returns the total number of all signatures.


### use_one_signer() -> bool
This function returns a boolean that indicates whether there is exactly 1 signature.


### swiftyH(...items) -> hash
Generates a swifty hash from the given parameters.


### pop_from_y(...items) -> hash
Removes the first value from Y stack and returns that value.


### sha256d(...items) -> hash
Generates and returns a duplicate SHA256 hash.


### sha3(...items) -> hash
Generates and returns a SHA3-256 hash.