// Speichert alle Zulässigen Buchstaben ab
let avail_allowed_chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_'];

// Dieses Regex Prüft ob es sich um einen Hex String handelt
let is_hex_regex = (/^[0-9a-fA-F]+$/);

// Dieses Regex Prüft ob es sich um eine Zahl handelt
let is_number_regex = (/^\d+$/);

// Definiert die Verfügbaren Keywörter
let key_words = {
    "if":{ type:"CONDITION", name:"IF" },
    "else":{ type:"CONDITION", name:"ELSE" },
    "elseif":{ type:"CONDITION", name:"ELSEIF" },
    "PublicKey":{ type:"PUBLIC_KEY", name:"PUBLIC_KEY" },
    "secp256k1":{ type:"CRYPTO_ALGORITHM", name:"SECP256K1_CRYPTO_ALGORITHM" },
    "curve25519":{ type:"CRYPTO_ALGORITHM", name:"CURVE25519_CRYPTO_ALGORITHM" },
};

// Definiert alle Verfügabren Funktionen 
let def_functions = {
    /* 
        Diese Funktion überprüft eine Signatur
    */
    "verify_sig":{ type:"EMIT_FUNCTION", name:"VERIFY_SIGNATURES" },

    /* 
        Diese Funktion fügt einen Öffentlichen Schlüssel,
        durch das Hinzufügen des Öffentlichen Schlüssel wird dieser berechtigt eine Ausgabe zu verwenden
    */
    "add_verify_key":{ type:"EMIT_FUNCTION", name:"ADD_PUBLIC_VERIFY_KEY" },

    /* 
        Diese Funktion Kombiniert add_verify_key + verify_sig
    */
    "add_verify_key_and_eq_verfiy_signature":{ type:"EMIT_FUNCTION", name:"ADD_PUBLIC_VERIFY_KEY_AND_VERIFY_SIGNATURES" },

    /* 
        Diese Funktion bricht den Aktuellen Vorgang ab und Signalisiert somit dass das Skript ungültig ist
    */
    "abort":{ type:"EMIT_FUNCTION", name:"ABORT_SKRIPT_RETURN_FALSE" },

    /* 
        Diese Funktion bricht den Aktuellen Vorgang ab und Signalisiert somit dass das Skript ungültig ist
    */
    unlock_output:{ type:"EMIT_FUNCTION", name:"UNLOCK_OUTPUT" },
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
    let current_c_list = [], c_prev = '', rnd = 0;
    for await(let titem of cleared) {
        // Es wird geprüft ob es sich um einen Token handelt
        if(Object.keys(tokens).includes(titem) === true) {
            // Es wird geprüft im StringValue ein Wert vorhanden ist
            if(c_prev.length > 0) {
                // Es wird geprüft ob es sich um eine Nummer handelt
                if(is_number_regex.test(c_prev) === true) {
                    // Es wird geprüft ob die Zahl in Form als String die Mindestgröße überschreitet
                    if(c_prev.length > 78) throw new Error('Number value is to big');

                    // Es wird geprüft ob es sich um eine Zulässige Zahl handelt
                    if(Number.isInteger(c_prev) !== true) throw new Error('Number value is invalid');

                    // Es wird geprüft ob die Maximalgröße von Zahlen überschritten wurde
                    if(BigInt(c_prev) > BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")) throw new Error();

                    // Der wird hinzugefügt
                    current_c_list.push({ type:'VALUE', name:'NUMBER', value:bigInt(c_prev) })
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