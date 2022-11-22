let test_condition_address = `
if #total_signers = 1
    push_key secp256k1 7607bc03c8d53fa69c8286caed89d1b90126a487deb7366c712fd39e50da6127
else
    if #n_block_apel <= 50
        push_key secp256k1 7607bc03c8d53fa69c8286caed89d1b90126a487deb7366c712fd39e50da6127
        push_key curve25519 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57
        push_n_m 2
    else
        push_key secp256k1 7607bc03c8d53fa69c8286caed89d1b90126a487deb7366c712fd39e50da6127
        push_key curve25519 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57
        push_n_m 1
    endif
endif
`.replace(/(\r\n|\n|\r)/gm, " ").replace(/  +/g, ' ').trim();

console.log()
console.log(test_condition_address.split(" "));