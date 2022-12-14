const { validate, getAddressInfo } = require('bitcoin-address-validation');
const blockchain_crypto = require('blckcrypto');
const op_codes = require('./opcodes');
let { bech32 } = require('bech32');
const web3 = require('web3');

// Speichert alle Verfügbaren Chainstate Commands ab
let chain_state_commands = {
    unlocking_script_hash:[op_codes.op_unlock_script_hash],
    locking_script_hash:[op_codes.op_lock_script_hash],
    current_b_hight:[op_codes.op_current_block_hight],
    current_diff:[op_codes.op_current_block_diff],
    last_block_hash:[op_codes.op_last_block_hash],
    unlock_script_sig:[op_codes.op_unlock_scriptsig_pubkey],
    total_signatures:[op_codes.op_total_signatures]
};

//Speichert alle Verfügabren Emit Funktionen ab
let emit_functions = {
    ADD_PUBLIC_VERIFY_KEY_AND_VERIFY_SIGNATURES:[
       op_codes.op_add_pk_sverify
    ],
    ABORT_SKRIPT_RETURN_FALSE:[
        op_codes.op_script_abort
    ],
    ADD_PUBLIC_VERIFY_KEY:[
        op_codes.op_add_verify_key
    ],
    CHECK_BLOCKBLOCKVERIFY:[
        op_codes.op_check_blockblockverify
    ],
    EQ_UNLOCKING_SCRIPT_HASH:[
        op_codes.op_eq_unlock_script_hash
    ],
    UNLOCK_WHEN_SIG_VERIFY:[
        op_codes.op_unlock_when_sig_verify
    ],
    CHECKLOCKTIMEVERIFY:[
        op_codes.op_check_locktimeverify
    ],
    EQ_SPEFIC_SIG_PKEY:[
        op_codes.op_eq_signers
    ],
    PUSH_TO_Y_STACK:[
        op_codes.op_push_to_y
    ],
    VERIFY_SIGNATURES:[
        op_codes.op_check_sig
    ],
    UNLOCK_SCRIPT:[
        op_codes.op_unlock
    ],
    EXIT_SCRIPT:[
        op_codes.op_exit
    ],
    SET_N_OF_M:[
        op_codes.op_set_n_of_m
    ],
};

// Speichert alle Value Funktionen ab
let value_functions = {
    VERIFY_SIGNATURE_IS:[
        op_codes.op_value_verify_sig
    ],
    UNLOCKING_SCRIPT_HASH:[
        op_codes.op_unlock_script_hash
    ],
    LOCKING_SCRIPT_HASH:[
        op_codes.op_lock_script_hash
    ],
    CURRENT_BLOCK_HIGHT:[
        op_codes.op_current_block_hight
    ],
    CURRENT_DIFF:[
        op_codes.op_current_block_diff
    ],
    CURRENT_LAST_BLOCK_HASH:[
        op_codes.op_last_block_hash
    ],
    IS_SIGNERS:[
        op_codes.op_eq_signers
    ],
    GET_TOTAL_SIGNERS:[
        op_codes.op_total_signatures
    ],
    USE_ONE_SIGNER:[
        op_codes.op_is_one_signer
    ],
    HASH_SHA256D:[
        op_codes.op_sha256d
    ],
    HASH_SWIFTYH_256:[
        op_codes.op_swifty_h
    ],
    SHA3_256:[
        op_codes.op_sha3
    ],
    POP_FROM_Y:[
        op_codes.op_pop_from_y
    ]
};

// Definiert die verschiedenen If typen
let if_types = {
    IF_START:'IF',
    ELSE_IF:'ELSEIF',
    ELSE:'ELSE',
    TRUE:'TRUE',
    FALSE: 'FALSE'
};

// Gibt die Verschiedenen Value Funktionstypen an
let value_io_function_types = {
    VALUE_FUNCTION:0,
    EMIT_FUNCTION:1,
    IF_STATE:2
};

// Gibt den OpCode für eine Value Funktion an
async function get_value_function_op_code(function_name) {
    // Es wird geprüft ob es sich um einen gültigen Chainstate command hadnelt
    if(Object.keys(value_functions).includes(function_name) !== true) return false;

    // Es wird der Passende OP_Code ermittelt
    let resolved_op_codes = [];
    for(let otem of value_functions[function_name]) resolved_op_codes.push(otem);

    // Der OP_CODE wird zurückgegeben
    return resolved_op_codes.join('');
};

// Gibt ein OpCode für eine Emit Funktion aus
async function get_emit_function_op_code(function_name) {
    // Es wird geprüft ob es sich um einen gültigen Chainstate command hadnelt
    if(Object.keys(emit_functions).includes(function_name) !== true) return false;

    // Es wird der Passende OP_Code ermittelt
    let resolved_op_codes = [];
    for(let otem of emit_functions[function_name]) resolved_op_codes.push(otem);

    // Der OP_CODE wird zurückgegeben
    return resolved_op_codes.join('');
};

// Gibt den OP_CODE für ein ChainSate befehl aus
async function get_chain_state_op_code(str_command_value) {
    // Es wird geprüft ob es sich um einen gültigen Chainstate command hadnelt
    if(Object.keys(chain_state_commands).includes(str_command_value) !== true) return false;

    // Es wird der Passende OP_Code ermittelt
    let resolved_op_codes = [];
    for(let otem of chain_state_commands[str_command_value]) resolved_op_codes.push(otem);

    // Der OP_CODE wird zurückgegeben
    return resolved_op_codes.join('').toLowerCase();
};

// Gibt an, ob der Nächste Wert auf dem Stack, ein Hexwert ist
async function is_next_hex_string(tokens) {
    // Es wird geprüft ob Mindestens 1 Wert im Stack vorhanden sind
    if(tokens.length < 1) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es sich um einen Hex String handelt
    let last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'VALUE' || last_t_obj.name !== 'HEX_STR') return false;

    // Die länge des Hexstrings wird ermittelt
    let hex_str_len = last_t_obj.value.toString(16).length.toString(16).padStart(2, '0');

    // Es handelt sich um einen Hex String, dder Hexwert und die neue Tokenliste wird zurückgegeben
    return { tokens:temp_token_lst, inner:[op_codes.op_code_hex_value, hex_str_len, last_t_obj.value].join('') };
};

// Gibt an, ob als der Nächste Wert dem Stack eine Zahl ist
async function is_next_a_number(tokens) {
    // Es wird geprüft ob Mindestens 1 Wert im Stack vorhanden sind
    if(tokens.length < 1) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es sich um einen Hex String handelt
    let last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'VALUE' || last_t_obj.name !== 'NUMBER') return false;

    // Es wird geprüft ob es sich um ein 8 Bit Integer handelt
    if(BigInt('0xFF') >= last_t_obj.value) {
        let hex_value = last_t_obj.value.toString(16).padStart(2, '0');
        return { tokens:temp_token_lst, inner:[op_codes.op_uint_8, hex_value].join('') };
    }
    else if(BigInt('0xFFFF') >= last_t_obj.value) {
        let hex_value = last_t_obj.value.toString(16).padStart(4, '0');
        return { tokens:temp_token_lst, inner:[op_codes.op_uint_16, hex_value].join('') };
    }
    else if(BigInt('0xFFFFFFFF') >= last_t_obj.value) {
        let hex_value = last_t_obj.value.toString(16).padStart(8, '0');
        return { tokens:temp_token_lst, inner:[op_codes.op_uint_32, hex_value].join('') };
    }
    else if(BigInt('0x7FFFFFFFFFFFFFFF') >= last_t_obj.value) {
        let hex_value = last_t_obj.value.toString(16).padStart(16, '0');
        return { tokens:temp_token_lst, inner:[op_codes.op_uint_64, hex_value].join('') };
    }
    else if(BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF') >= last_t_obj.value) {
        let hex_value = last_t_obj.value.toString(16).padStart(32, '0');
        return { tokens:temp_token_lst, inner:[op_codes.op_uint_128, hex_value].join('') };
    }
    else if(BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF') >= last_t_obj.value) {
        let hex_value = last_t_obj.value.toString(16).padStart(64, '0');
        return { tokens:temp_token_lst, inner:[op_codes.op_uint_256, hex_value].join('') };
    }
    else {
        throw new Error('Invalid number');
    }
};

// Gibt on ob es sich um einen Boolean Wert handelt
async function is_next_a_bool(tokens) {
    // Es wird geprüft ob Mindestens 1 Wert im Stack vorhanden sind
    if(tokens.length < 1) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es sich um ein Bool handelt
    let last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'BOOL') return false;

    // Der Type des Bools wird ermittelt
    if(last_t_obj.name === 'TRUE') {
        return { tokens:temp_token_lst, inner:op_codes.op_true };
    }
    else if(last_t_obj.name === 'FALSE') {
        return { tokens:temp_token_lst, inner:op_codes.op_false };
    }
    else {
        throw new Error('Invalid script');
    }
};

// Gibt an als ob näächstes ein Öffentlicher Schlüssel kommt
async function is_pkey_declaration(tokens) {
    // Es wird geprüft ob Mindestens 5 Werte im Stack vorhanden sind
    if(tokens.length < 5) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es sich um einen PublicKey handelt
    let last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'PUBLIC_KEY' || last_t_obj.name !== 'PUBLIC_KEY') return false;

    // Es wird geprüft ob als nächstes ein LPAREN Vorhanden ist
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'BRACKET' || last_t_obj.name !== 'LPAREN') throw new Error('Invalid data');

    // Es wird geprüft ob es sich um einen gültigen Algorithms handelt
    let algo_last = temp_token_lst.shift();
    if(algo_last.type !== 'CRYPTO_ALGORITHM') throw new Error('Invalid data');
    if(algo_last.name !== 'CURVE25519_CRYPTO_ALGORITHM' && algo_last.name !== 'SECP256K1_CRYPTO_ALGORITHM' && algo_last.name !== 'BLS12381_CRYPTO_ALGORITHM') throw new Error('Invalid data');

    // Es wird geprüft ob als Nächstes ein Komma kommt
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'BRACKET' || last_t_obj.name !== 'COMMA') throw new Error('Invalid data');

    // Es wird geprüft ob als nächstes ein Hexwert vorhanden ist
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'VALUE' || last_t_obj.name !== 'HEX_STR') throw new Error('Invalid data');
    let hexed_value = last_t_obj.value;

    // Es wird geprüft ob als nächstes ein RPAREN Vorhanden ist
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'BRACKET' || last_t_obj.name !== 'RPAREN') throw new Error('Invalid data');

    // Es wird geprüft ob die Länge des Verwendeten Schlüssels korrekt ist
    if(algo_last.name === 'CURVE25519_CRYPTO_ALGORITHM') {
        if(hexed_value.length !== 64) throw new Error('Invalid public key');
        return { tokens:temp_token_lst, inner:[op_codes.op_public_key_defination, op_codes.op_curve25519, hexed_value].join('').toLowerCase() };
    }
    else if(algo_last.name === 'SECP256K1_CRYPTO_ALGORITHM') {
        if(hexed_value.length !== 64) throw new Error('Invalid public key');
        return { tokens:temp_token_lst, inner:[op_codes.op_public_key_defination, op_codes.op_secp256k1_schnorr, hexed_value].join('').toLowerCase() };
    }
    else if(algo_last.name === 'BLS12381_CRYPTO_ALGORITHM') {
        if(hexed_value.length !== 96) throw new Error('Invalid public key');
        return { tokens:temp_token_lst, inner:[op_codes.op_public_key_defination, op_codes.op_bls12381, hexed_value].join('').toLowerCase() };
    }
    else {
        console.log(last_t_obj)
        throw new Error('Invalid data');
    }
};

// Gibt an ob als nächstes eine Ethereum oder Bitcoin Adresse kommt
async function is_address_declaration(tokens) {
    // Es wird geprüft ob Mindestens 5 Werte im Stack vorhanden sind
    if(tokens.length < 3) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es sich um einen PublicKey handelt
    let last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'ADDRESS') return false;

    // Es wird geprüft ob als nächstes ein LPAREN Vorhanden ist
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'BRACKET' || last_t_obj.name !== 'LPAREN') throw new Error('Invalid data');

    // Es wird geprüft ob es sich um einen String handelt
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'VALUE' || last_t_obj.name !== 'STRING') throw new Error('Invalid data');

    // Es wird geprüft ob die Daten mit einem RPAREN enden
    let rparren_check = temp_token_lst.shift();
    if(rparren_check.type !== 'BRACKET' || rparren_check.name !== 'RPAREN') throw new Error('Invalid data');

    // Es wird geprüft ob es sich um eine Bitcoin Adresse handelt
    if(validate(last_t_obj.value) === true) {
        // Die Informationen der Adresse werden abgerufen
        let address_informations = getAddressInfo(last_t_obj.value);

        // Es wird geprüft ob es sich um eine Zulässige Adresse handelt
        if(address_informations.type === 'p2wpkh') {
            let hex_plain_address = Buffer.from(bech32.decode(last_t_obj.value).words).toString('hex');
            return { tokens:temp_token_lst, inner:[op_codes.op_address_defination, op_codes.op_btc_address_32, hex_plain_address].join('').toLowerCase() };
        }
        else {
            throw new Error()
        }
    }
    else if(web3.utils.isAddress(last_t_obj.value) === true) {
        return { tokens:temp_token_lst, inner:[op_codes.op_address_defination, op_codes.op_eth_address, last_t_obj.value.replace('0x', '')].join('').toLowerCase() };
    }
    else {
        console.log(web3.utils)
        throw new Error('Invalid address data');
    }
};

// Gibt an ob als Nächstes ein CHAIN_SATE_VALUE Kommt
async function is_chain_state_value(tokens) {
    // Es wird geprüft ob Mindestens 2 Werte im Stack vorhanden sind
    if(tokens.length < 2) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es sich um eienn Hashtag handelt
    let last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'COMPARATOR' || last_t_obj.name !== 'NE') return false;

    // Es wird geprüft ob es sich als nächstes um einen String handelt
    last_t_obj = temp_token_lst.shift();
    if(last_t_obj.type !== 'VALUE' || last_t_obj.name !== 'STRING') throw new Error('Invalid script');

    // Es wird versucht den Passenden OpCode zu ermitteln
    let op_code_retrive = await get_chain_state_op_code(last_t_obj.value);
    if(op_code_retrive === false) throw new Error('Op code not found');

    // Die Daten werden zurückgegeben
    return { tokens:temp_token_lst, inner:[op_codes.op_chain_state_value, op_code_retrive] };;
};

// Extrahiert einen Mathematischen Parrent
async function is_math_parrent_cube(tokens) {
    return false;
};

// Gibt an, ob es sich um eine Mathematische Formell handelt
async function is_math_code(tokens) {
    return false;
};

// Wird verwendet um eine Value Funktion auszulesen
async function is_next_value_function(tokens) {
    // Es wird geprüft ob Mindestens 4 Elemente auf dem Stack liegen
    if(tokens.length < 4) return false;

    // Es wird eine Temporäre Liste angelegt
    let temp_lst = tokens.slice();

    // Es wird geprüft ob der Nächste Eintrag auf dem Stack ein EMIT_FUNCTION Aufruf ist
    let next_element = temp_lst.shift();
    if(next_element.type !== 'VALUE_OUTPUT') return false;

    // Es wird versucht den OP_CODE für die EMIT Funtion zu ermitteln
    let r_op_code = await get_value_function_op_code(next_element.name);
    if(r_op_code === false) throw new Error('Invalid value function');

    // Es wird geprüft ob als nächstes ein Parrentcube gibt
    let parrent_cube = await is_parrent_cube(temp_lst, value_io_function_types.EMIT_FUNCTION);
    if(parrent_cube === false) throw new Error('Invalid script')
    temp_lst = parrent_cube.tokens;

    // Die Restlichen Tokens werden zurückgeben
    return { tokens:temp_lst, inner:[op_codes.op_value_function, r_op_code, parrent_cube.inner].join('') };
};

// Gibt an, ob es sich um eine IF Confition handelt
async function is_if_condition(tokens) {
    // Es wird geprüft ob Mindestens 3 Items auf dem Stack liegen
    if(tokens.length < 3) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob eine Zulässige Anfrage vorhanden ist
    let next_element = temp_token_lst.shift();

    // Es wird geprüft ob es sich um eine EQUALS Anweisung handelt
    if(next_element.type === 'OPERATOR' && next_element.name === 'EQUALS') {
        next_element = temp_token_lst.shift();
        if(next_element.type !== 'OPERATOR' || next_element.name !== 'EQUALS') return false;
        return { tokens:temp_token_lst, inner:op_codes.op_match };
    }
    else if(next_element.type === 'COMPARATOR' && next_element.name === 'LT') {
        next_element = temp_token_lst.shift();
        if(next_element.type !== 'COMPARATOR' || next_element.name !== 'LT') return false;
        return { tokens:temp_token_lst, inner:op_codes.op_ismall };
    }
    else if(next_element.type === 'COMPARATOR' && next_element.name === 'GT') {
        next_element = temp_token_lst.shift();
        if(next_element.type !== 'COMPARATOR' || next_element.name !== 'GT') return false;
        return { tokens:temp_token_lst, inner:op_codes.op_ibigger };
    }
    else if(next_element.type === 'COMPARATOR' && next_element.name === 'EXCLAMATION_MARK') {
        next_element = temp_token_lst.shift();
        if(next_element.type !== 'COMPARATOR' || next_element.name !== 'EXCLAMATION_MARK') return false;
        return { tokens:temp_token_lst, inner:op_codes.op_nmatch };
    }
    else {
        return false;
    }
};

// Extrahiert ein Parrent Cube
async function is_parrent_cube(tokens, function_type=value_io_function_types.EMIT_FUNCTION) {
    // Es wird geprüft ob Mindestens 2 Items auf dem Stack liegen
    if(tokens.length < 2) return false;

    // Speichert ein Temporärers Tokens Objelt ab
    let temp_token_lst = tokens.slice();

    // Es wird geprüft ob es ein LPARRENT ist
    let next_element = temp_token_lst.shift();
    if(next_element.name !== 'LPAREN') return false;

    // Der Stack wird abgearbeitet bis der Letzte RPARRENT für das Aktuelle LPARRENT korrekt ist
    let l_parrents = 1, r_parrents = 0, paren_inner = [];
    while(temp_token_lst.length > 0) {
        // Das Aktuelle Item wird abgerufen
        let current_item = temp_token_lst.shift();

        // Es wird geprüft ob es sich um einen LPARRENT Handelt
        if(current_item.name === 'LPAREN') {
            // Der LPAREN Counter wird hochgezählt
            l_parrents++;

            // Das Element wird hinzugefügt
            paren_inner.push(current_item);
        }
        else if(current_item.name === 'RPAREN') {
            // Der RPAREN Counter wird hochgezählt
            r_parrents++;

            // Es wird geprüft ob Genausoviele LPAREN wie RPAREN gefunden wurden
            if(r_parrents === l_parrents) break;
            else {
                // Das Element wird Hinzugefügt
                paren_inner.push(current_item);
            }
        }
        else {
            paren_inner.push(current_item);
        }
    }

    // Es wird geprüft ob genausoviele LPAREN wie RPAREN abgrufen werden
    if(l_parrents !== r_parrents) throw new Error('Invalid script');

    // Wird verwendet wenn es sich um ein Function Parren Cube handelt
    const f_parren_cube = async() => {
        // Es wird versucht die Innerdaten auszuwerten
        let parsed_hex_value = [], total_values = 0;

        // Es wird eine Kopie der Innerdaten gemacht
        let inner_d_copy = paren_inner.slice();

        // Die Innerdaten werden abgearbeitet
        while(inner_d_copy.length > 0) {
            // Es wird geprüft ob ein Öffentlicher Schlüssel definiert wird
            let inner_result = await is_pkey_declaration(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel handelt
            inner_result = await is_address_declaration(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um einen Hexwert handelt
            inner_result = await is_next_hex_string(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob als nächstes ein Mathematischer Parrent Kommt
            inner_result = await is_math_parrent_cube(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob als nächstes Mathemaische Aufgaben durchgeführt werden sollen
            inner_result = await is_math_code(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um eine Nummer handelt
            inner_result = await is_next_a_number(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Wird geprüft ob es sich um ein Bool handelt
            inner_result = await is_next_a_bool(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Wird geprüft ob es sich um eine Value Funktion handelt
            inner_result = await is_next_value_function(inner_d_copy);
            if(inner_result !== false) {
                // Die Daten werden geupdated
                parsed_hex_value.push(inner_result.inner);
                inner_d_copy = inner_result.tokens;
                total_values++;

                // Es wird geprüft als nächstes ein Item kommt
                if(inner_d_copy.length > 0) {
                    // Es wird geprüft ob das nächse Item ein komma ist
                    let t_obj = inner_d_copy.shift();
                    if(t_obj.type !== 'BRACKET' || t_obj.name !== 'COMMA') throw new Error('Invalid data');
                }

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es handelt sich um ein Fehleraftes Skript
            throw new Error(`Invalid script stack`);
        }

        // Die Gesamtzahl der Eingaben wird in eine Hexadezimalzahl umgewandelt
        let hex_total_value_len = total_values.toString(16).padStart(2, '0');

        // Gibt den Aktuellen String an
        let current_parm_total = ((parsed_hex_value.join('').length > 0) ? parsed_hex_value.join('') : '');

        // Der Finale Hex String wird erstellt
        let final_hex_string = [op_codes.op_parren_fnc_cube, hex_total_value_len, current_parm_total].join('');

        // Die Daten werden zurückgegeben
        return { tokens:temp_token_lst, inner:final_hex_string };
    };

    // Wird verwendet wenn es sich um ein IF Paren Cube handelt
    const if_parren_cube = async() => {
        // Es wird eine Kopie der Innerdaten gemacht
        let inner_d_copy = paren_inner.slice();

        // Speichert den Linken prüfwert ab
        let left_value = null;

        // Speichert die Condition ab
        let check_condition = null;

        // Speichert den Rechten prüfwert ab
        let right_value = null;

        // Die Innerdaten werden abgearbeitet
        while(inner_d_copy.length > 0) {
            // Es wird geprüft ob ein Öffentlicher Schlüssel definiert wird
            let inner_result = await is_pkey_declaration(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um einen Öffentlichen Schlüssel handelt
            inner_result = await is_address_declaration(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um einen Hexwert handelt
            inner_result = await is_next_hex_string(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob als nächstes ein Mathematischer Parrent Kommt
            inner_result = await is_math_parrent_cube(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob als nächstes Mathemaische Aufgaben durchgeführt werden sollen
            inner_result = await is_math_code(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um eine Nummer handelt
            inner_result = await is_next_a_number(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    console.log(check_condition)
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um ein Chainstate Wert handelt
            inner_result = await is_chain_state_value(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Wird geprüft ob es sich um ein Bool handelt
            inner_result = await is_next_a_bool(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    console.log(check_condition)
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Wird geprüft ob es sich um eine Value Funktion handelt
            inner_result = await is_next_value_function(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob es sich um den Linken oder den Rechten wert handelt
                if(left_value === null && right_value === null && check_condition === null) {
                    left_value = inner_result;
                }
                else if(left_value !== null && right_value === null && check_condition !== null) {
                    right_value = inner_result;
                }
                else {
                    console.log(check_condition)
                    throw new Error('Invalid stack script');
                }

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es wird geprüft ob es sich um eine IF-Kondition handelt
            inner_result = await is_if_condition(inner_d_copy);
            if(inner_result !== false) {
                // Es wird geprüft ob bereits eine Kondition vorhanden ist
                if(check_condition !== null) throw new Error('Invalid stack script');

                // Die Kondition wird geschrieben
                check_condition = inner_result;

                // Die Daten werden geupdated
                inner_d_copy = inner_result.tokens;

                // Die Nächste Runde der Schleife wird durchgeführt
                continue;
            }

            // Es handelt sich um ein Fehleraftes Skript
            console.log(inner_d_copy)
            throw new Error(`Invalid script stack`);
        }

        // Der String wird zusammengebaut und zurückgegeben
        let str_template = [check_condition.inner, ...left_value.inner, right_value.inner];
        return { tokens:temp_token_lst, inner:str_template.join('') };
    };

    // Es wird gepüft ob es sich um ein IF Statement handelt
    if(function_type === value_io_function_types.EMIT_FUNCTION || function_type === value_io_function_types.VALUE_FUNCTION) return (await f_parren_cube());
    else return (await if_parren_cube());
};

// Gibt an, ob als nächstes ein Funktionsaufrurf durchgeführt wird
async function is_emit_function_call(tokens, parrn_inner=false) {
    // Es wird geprüft ob Mindestens 4 Elemente auf dem Stack liegen
    if(tokens.length < 4) return false;

    // Es wird eine Temporäre Liste angelegt
    let temp_lst = tokens.slice();

    // Es wird geprüft ob der Nächste Eintrag auf dem Stack ein EMIT_FUNCTION Aufruf ist
    let next_element = temp_lst.shift();
    if(next_element.type !== 'EMIT_FUNCTION') return false;

    // Es wird versucht den OP_CODE für die EMIT Funtion zu ermitteln
    let r_op_code = await get_emit_function_op_code(next_element.name);
    if(r_op_code === false) throw new Error('Invalid emit function');

    // Es wird geprüft ob als nächstes ein Parrentcube gibt
    let parrent_cube = await is_parrent_cube(temp_lst, value_io_function_types.EMIT_FUNCTION);
    if(parrent_cube === false) throw new Error('Invalid script')
    temp_lst = parrent_cube.tokens;

    // Es wird geprüft ob die Fuktion mit SEMICOLON beendet werden soll
    next_element = temp_lst.shift();
    if(parrn_inner === false) {
        if(next_element.type !== 'BRACKET' || next_element.name !== 'SEMICOLON') return false;
    }

    // Die Restlichen Tokens werden zurückgeben
    return { tokens:temp_lst, inner:[op_codes.op_emit_function, r_op_code, parrent_cube.inner].join('') };
};

// Gibt an ob als nächstes ein Codeblock kommt
async function next_is_code_block(tokens) {
    // Es wird geprüft ob Mindestens 4 Elemente auf dem Stack liegen
    if(tokens.length < 2) return false;

    // Es wird eine Temporäre Liste angelegt
    let temp_lst = tokens.slice();

    // Es wird geprüft ob der Nächste Eintrag auf dem Stack ein BLOCKSTART ist
    let next_element = temp_lst.shift();
    if(next_element.type !== 'BRACKET' || next_element.name !== 'BLOCKSTART') return false;

    // Der Stack wird abgearbeitet bis der Letzte BLOCK_START für das Aktuelle BLOCKEND korrekt ist
    let l_parrents = 1, r_parrents = 0, paren_inner = [];
    while(temp_lst.length > 0) {
        // Das Aktuelle Item wird abgerufen
        let current_item = temp_lst.shift();

        // Es wird geprüft ob es sich um einen LPARRENT Handelt
        if(current_item.name === 'BLOCKSTART') {
            // Der LPAREN Counter wird hochgezählt
            l_parrents++;

            // Das Element wird hinzugefügt
            paren_inner.push(current_item);
        }
        else if(current_item.name === 'BLOCKEND') {
            // Der RPAREN Counter wird hochgezählt
            r_parrents++;

            // Es wird geprüft ob Genausoviele LPAREN wie RPAREN gefunden wurden
            if(r_parrents === l_parrents) break;
            else {
                // Das Element wird Hinzugefügt
                paren_inner.push(current_item);
            }
        }
        else {
            paren_inner.push(current_item);
        }
    }

    // Es wird geprüft ob genausoviele LPAREN wie RPAREN abgrufen werden
    if(l_parrents !== r_parrents) throw new Error('Invalid script');

    // Es wird versucht den Codeblock einzulesen
    let readed_code_block = await script_token_parser(paren_inner, true);
    if(readed_code_block === undefined || readed_code_block === null) throw new Error('Invalid script stack');

    // Die Restlichen Tokens werden zurückgeben
    return { tokens:temp_lst, inner:readed_code_block.inner };
};

// Gibt an, ob als nächstes ein IF Block kommt
async function is_if_statement(tokens, elseif_block=if_types.IF_START) {
    // Es wird geprüft ob es sich um einen IF_BLOCK handelt
    if(elseif_block === if_types.IF_START || elseif_block === if_types.ELSE_IF) {
        if(tokens.length < 7) return false;
    }
    else if(elseif_block === if_types.ELSE) {
        if(tokens.length < 3) return false;
    }
    else {
        throw new Error('Invalid script')
    }

    // Es wird eine Temporäre Liste angelegt
    let temp_lst = tokens.slice();

    // Es wird geprüft ob der Nächste Eintrag auf dem Stack ein IF_STATEMNT ist
    let next_element = temp_lst.shift();
    if(next_element.type !== 'CONDITION' || next_element.name !== elseif_block) return false;

    // Es wird geprüft ob als nächstes ein PARREN Cube kommt
    let parren_cube = null;
    if(elseif_block === if_types.IF_START || elseif_block === if_types.ELSE_IF) {
        parren_cube = await is_parrent_cube(temp_lst, value_io_function_types.IF_STATE);
        if(parren_cube === false) throw new Error('Invalid script stack');
        temp_lst = parren_cube.tokens;
    }

    // Es wird geprüft ob als nächstes ein Codeblock vorhanden ist
    let code_block = await next_is_code_block(temp_lst);
    if(code_block === false) throw new Error('Invalid script stack');
    temp_lst = code_block.tokens;

    // Die Länge des Codebereiches wird ermittelt
    let code_block_len = code_block.inner.length.toString(16).padStart(4, "0");

    // Es wird geprüft ob als nächstes ein Else Block kommt
    let next_is_else_block = [];
    if(elseif_block === if_types.IF_START) {
        // Die Schleife wird ausgeführt bis keine ELSE_IF Anweisung mehr folgt
        while(temp_lst.length > 0) {
            let else_if_check = await is_if_statement(temp_lst, if_types.ELSE_IF);
            if(else_if_check !== false) {
                temp_lst = else_if_check.tokens;
                next_is_else_block.push(else_if_check.inner);
            }
            else {
                break;
            }
        }

        // Es wird geprüft ob es sich um ein IF_STATEMENT handelt
        let else_check = await is_if_statement(temp_lst, if_types.ELSE);
        if(else_check !== false) {
            temp_lst = else_check.tokens;
            next_is_else_block.push(else_check.inner);
        }
    }

    // Die IF Anweisung hat werder ein Elseif noch einen Elseblock, die Daten es IF_BLOCKS wird zurückgegeben
    let pre_value_list = null;
    if(elseif_block === if_types.IF_START) {
        pre_value_list = [op_codes.op_if, parren_cube.inner, code_block_len, code_block.inner, ...next_is_else_block];
    }
    else if(elseif_block === if_types.ELSE_IF) {
        pre_value_list = [op_codes.op_elif, parren_cube.inner, code_block_len, code_block.inner, ...next_is_else_block];
    }
    else if(elseif_block === if_types.ELSE) {
        pre_value_list = [op_codes.op_else, code_block_len, code_block.inner];
    }
    else throw new Error('Invalid script tag');

    // Die Daten werden zurückgegeben
    return { tokens:temp_lst, inner:pre_value_list.join('') };
};

// Wird verwndet um die Skriptoken zu Paesen, Syntaxfehler oder Logikfehler werden hier entdeckt
async function script_token_parser(tokens, sub_block=false) {
    // Das Objekt wird Temporär abgespeichert
    let temp_stack_script = tokens.slice();

    // Speichert alle Extrahierten Hexstrings ab
    let extracted_hex_strings = [];

    // Die Schleife wird solange ausgeführt bis das Tempoöre Stack leer ist
    while(temp_stack_script.length > 0) {
        // Es wird geprüft ob es sich um einen Funktionsaufruf handelt
        let c_result = await is_emit_function_call(temp_stack_script);
        if(c_result !== false) {
            temp_stack_script = c_result.tokens;
            extracted_hex_strings.push(c_result.inner);
            continue;
        }

        // Es wird geprüft ob es sich um einen IF Block handelt
        c_result = await is_if_statement(temp_stack_script);
        if(c_result !== false) {
            temp_stack_script = c_result.tokens;
            extracted_hex_strings.push(c_result.inner);
            continue;
        }

        // Es handelt sich um einen Unbeaknnten Funktionsaufruf
        throw new Error('Invalid function call');
    }

    // Die Restlichen Tokens werden zurückgeben
    return { tokens:temp_stack_script, inner:extracted_hex_strings.join('') };
};

// Exportiert die Funktionen
module.exports = async function(tokens) {
    // Die Tokens werden geparst
    let script_tokens = await script_token_parser(tokens);

    // Es wird ein Hash aus dem Skript erstellt
    let script_hash = blockchain_crypto.sha3(256, script_tokens.inner.toLowerCase()).toLowerCase();

    // Die Daten werden zurückgegeben
    return { hex_script:script_tokens.inner, hash:script_hash };
};
