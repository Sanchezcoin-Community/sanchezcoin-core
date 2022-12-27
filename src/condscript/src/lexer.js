// Speichert alle Zulässigen Buchstaben ab
let avail_allowed_chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'];

// Dieses Regex Prüft ob es sich um einen Hex String handelt
let is_hex_regex = (/^[0-9a-fA-F]+$/);

// Dieses Regex Prüft ob es sich um eine Zahl handelt
let is_number_regex = (/^\d+$/);

// Definiert die Verfügbaren Keywörter
let key_words = {
    "curve25519":{ type:"CRYPTO_ALGORITHM", name:"CURVE25519_CRYPTO_ALGORITHM" },
    "secp256k1":{ type:"CRYPTO_ALGORITHM", name:"SECP256K1_CRYPTO_ALGORITHM" },
    "bls12381":{ type:"CRYPTO_ALGORITHM", name:"BLS12381_CRYPTO_ALGORITHM" },
    "PublicKey":{ type:"PUBLIC_KEY", name:"PUBLIC_KEY" },
    "BtcAddress":{ type:"ADDRESS", name:"BTC_ADDRESS" },
    "EthAddress":{ type:"ADDRESS", name:"ETH_ADDRESS" },
    "elseif":{ type:"CONDITION", name:"ELSEIF" },
    "else":{ type:"CONDITION", name:"ELSE" },
    "false":{ type:"BOOL", name:"FALSE" },
    "if":{ type:"CONDITION", name:"IF" },
    "true":{ type:"BOOL", name:"TRUE" },
};

// Definiert alle Verfügabren Funktionen 
let def_functions = {
    "add_verify_key_and_eq_verfiy_signature": { type:"EMIT_FUNCTION", name:"ADD_PUBLIC_VERIFY_KEY_AND_VERIFY_SIGNATURES" },
    "equal_unlocking_script_hash": { type:"EMIT_FUNCTION", name:"EQ_UNLOCKING_SCRIPT_HASH" },
    "equal_spefic_signature_pkey": { type:"EMIT_FUNCTION", name:"EQ_SPEFIC_SIG_PKEY" },
    "get_unlocking_script_hash": { type:"VALUE_OUTPUT", name:"UNLOCKING_SCRIPT_HASH" },
    "check_blocklock_verify": { type:"EMIT_FUNCTION", name:"CHECK_BLOCKBLOCKVERIFY" },
    "unlock_when_sig_verify": { type:"EMIT_FUNCTION", name:"UNLOCK_WHEN_SIG_VERIFY" },
    "get_locking_script_hash": { type:"VALUE_OUTPUT", name:"LOCKING_SCRIPT_HASH" },
    "get_last_block_hash": { type:"VALUE_OUTPUT", name:"CURRENT_LAST_BLOCK_HASH" },
    "get_current_block_hight": { type:"VALUE_OUTPUT", name:"CURRENT_BLOCK_HIGHT" },
    "check_locktime_verify": { type:"EMIT_FUNCTION", name:"CHECKLOCKTIMEVERIFY" },
    "add_verify_key": { type:"EMIT_FUNCTION", name:"ADD_PUBLIC_VERIFY_KEY" },
    "get_current_block_diff": { type:"VALUE_OUTPUT", name:"CURRENT_DIFF" },
    "verify_spfc_sig": { type:"VALUE_OUTPUT", name:"VERIFY_SIGNATURE_IS" },
    "get_total_signers": { type:"VALUE_OUTPUT", name:"GET_TOTAL_SIGNERS" },
    "abort": { type:"EMIT_FUNCTION", name:"ABORT_SKRIPT_RETURN_FALSE" },
    "verify_sig": { type:"EMIT_FUNCTION", name:"VERIFY_SIGNATURES" },
    "use_one_signer": { type:"VALUE_OUTPUT", name:"USE_ONE_SIGNER" },
    "push_to_y": { type:"EMIT_FUNCTION", name:"PUSH_TO_Y_STACK" },
    "swiftyH":{ type:"VALUE_OUTPUT", name:"HASH_SWIFTYH_256" },
    "set_n_of_m": { type:"EMIT_FUNCTION", name:"SET_N_OF_M" },
    "is_a_signer": { type:"VALUE_OUTPUT", name:"IS_SIGNERS" },
    "pop_from_y": { type:"VALUE_OUTPUT", name:"POP_FROM_Y" },
    "unlock": { type:"EMIT_FUNCTION", name:"UNLOCK_SCRIPT" }, 
    "sha256d":{ type:"VALUE_OUTPUT", name:"HASH_SHA256D" },
    "exit": { type:"EMIT_FUNCTION", name:"EXIT_SCRIPT" }, 
    "sha3": { type:"VALUE_OUTPUT", name:"SHA3_256" },
};

// Definiert die Festgelegeten Token
let tokens = {
    "+":{ type:"OPERATOR", name:"PLUS" },
    "-":{ type:"OPERATOR", name:"MINUS" },
    "*":{ type:"OPERATOR", name:"MULTIPLY" },
    "/":{ type:"OPERATOR", name:"DIVIDE" },
    "%":{ type:"OPERATOR", name:"MODULO" },
    "~":{ type:"OPERATOR", name:"NOT" },
    "=":{ type:"OPERATOR", name:"EQUALS" },
    "<":{ type:"COMPARATOR", name:"LT" },
    ">":{ type:"COMPARATOR", name:"GT" },
    "#":{ type:"COMPARATOR", name:"NE" },
    "&":{ type:"COMPARATOR", name:"AND" },
    "|":{ type:"COMPARATOR", name:"OR" },
    "!":{ type:"COMPARATOR", name:"EXCLAMATION_MARK" },
    "(":{ type:"BRACKET", name:"LPAREN" },
    ")":{ type:"BRACKET", name:"RPAREN" },
    "]":{ type:"BRACKET", name:"LBRACE" },
    "]":{ type:"BRACKET", name:"RBRACE" },
    "{":{ type:"BRACKET", name:"BLOCKSTART" },
    "}":{ type:"BRACKET", name:"BLOCKEND" },
    ";":{ type:"BRACKET", name:"SEMICOLON" },
    ".":{ type:"BRACKET", name:"DOT" },
    ",":{ type:"BRACKET", name:"COMMA" },
    "'":{ type:"BRACKET", name:"QUOTES" },
    '"':{ type:"BRACKET", name:"DOUBLEQUOTES" },
    ' ':{ type:"BRACKET", name:"SPACE" },
};

// Diese Funktion, gibt an, ob es sich um einen Hex String handelt
function is_hex_str(str_value) {
    // Der String wird mittels Regex geprüft
    if(is_hex_regex.test(str_value) !== true) return false;

    // Es wird versucht die Daten mittels dem Buffer einzuelesen
    try {
        let decoded = Buffer.from(str_value, 'hex').toString('hex');
        if(decoded !== str_value.toLowerCase()) throw new Error('')
    }
    catch(e) { return false; }

    // Es handelt sich um einen Hexstring
    return true;
};

// Wandelt ein ConditionsScript in Bytes um und gibt diese als Hex aus
async function lex_conditions_script(str_script) {
    // Der String wird von sinfreien eingaben befreit
    let cleared = str_script.replace(/(\r\n|\n|\r)/gm, " ").replace(/  +/g, ' ').trim().split('');

    // Die Liste wird abgearbeitet
    let current_c_list = [], c_prev = '';
    for await(let titem of cleared) {
        // Es wird geprüft ob es sich um einen Token handelt
        if(Object.keys(tokens).includes(titem) === true) {
            // Es wird geprüft im StringValue ein Wert vorhanden ist
            if(c_prev.length > 0) {
                // Es wird geprüft ob es sich um eine Nummer handelt
                if(is_number_regex.test(c_prev) === true) {
                    // Es wird geprüft ob die Zahl in Form als String die Mindestgröße überschreitet
                    if(c_prev.length > 78) throw new Error('Number value is to big');

                    // Es wird geprüft ob die Maximalgröße von Zahlen überschritten wurde
                    if(BigInt(c_prev) > BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")) throw new Error();

                    // Der wird hinzugefügt
                    current_c_list.push({ type:'VALUE', name:'NUMBER', value:BigInt(c_prev) })
                }
                else {
                    // Es wird geprüft ob es sich um ein KEYWORD handelt
                    if(Object.keys(key_words).includes(c_prev) === true) {
                        current_c_list.push(key_words[c_prev]);
                    }
                    // Es wird geprüft ob es sich um eine Funktion handelt
                    else if(Object.keys(def_functions).includes(c_prev) === true) {
                        current_c_list.push(def_functions[c_prev]);
                    }
                    else {
                        // Es wird geprüft ob der hexwert größert als 256 Zeichen ist
                        if(c_prev.length > 255) throw new Error('To big string value');

                        // Es wird geprüft ob es sich um einen Hexstring handelt
                        if(is_hex_str(c_prev) === true) {
                            current_c_list.push({ type:'VALUE', name:'HEX_STR', value:c_prev });
                        }
                        else {
                            current_c_list.push({ type:'VALUE', name:'STRING', value:c_prev });
                        }
                    }
                }
            }

            // Der Aktuelle C_PREV Wert wird zurückgesetzt
            c_prev = '';

            // Das Element wird hinzugefügt
            current_c_list.push(tokens[titem]);
        }
        // Es wird geprüft ob es sich um ein Buchstaben oder einen Untersich handelt
        else if(avail_allowed_chars.includes(titem.toLowerCase()) === true) {
            c_prev = `${c_prev}${titem}`;
        }
        // Es wird geprüft ob es sich um eine Nummer handelt
        else if(is_number_regex.test(titem) === true) {
            c_prev = `${c_prev}${titem}`;
        }
        // Es handelt sich um ein Unbekanntes Zeichen
        else {
            throw new Error(`Illegal character ${titem}`);
        }
    }

    // Es werden alle Leerzeichen Entfernt
    let cleaned_c_list = [];
    for await(let xtem of current_c_list) {
        if(xtem.name !== 'SPACE') cleaned_c_list.push(xtem)
    }

    // Die Tokens werden zurückgegeben
    return cleaned_c_list;
};

// Die Funktion wird Exportiert
module.exports = lex_conditions_script;