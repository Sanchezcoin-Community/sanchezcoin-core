const { ChainStateValue, HexString, compareValues } = require('./obj_types');
const script_token_parser = require('./parser');
const { createHash } = require('node:crypto');
const { op_codes } = require('./opcodes');
const lexer = require('./lexer');


// Speichert die Möglichen Skripttypen ab
const script_types = {
    LOCKING:0,
    UNLOCKING:1
}

// Speichert die Standardwerte für ein Skript ab
const DEFAULT_STATES = {
    output_is_unlocked:false,
    finally_proof:false,
    aborted:false,
    invalid:false
};


// Erzeugt einen SHA256 Hash
function sha256d(content) {  
    let hashd = createHash('sha256').update(Buffer.from(content, 'ascii')).digest().reverse();
    return createHash('sha256').update(hashd).digest().reverse().toString('hex');
};

// Wird verwendet um zu überprüfen ob es sich um einen gültigen Hexstring handelt
function is_validate_hex_str(hex_str) {
    try { let a = Buffer.from(hex_str, 'hex').toString('hex'); return hex_str.toLowerCase() === a.toLowerCase(); }
    catch(e) { return false; }
};

// Wird ausgeführt um ein einfaches Skript auszuführen
const condscript_interpreter = async(locking_script, unlocking_script, c_block_hight=0, scriptSigs=[]) => {
    // Es wird geprüft ob es sich bei den Skripten um Hexwerte handelt
    if(is_validate_hex_str(locking_script) !== true) throw new Error('Invalid script data');

    // Es wird ein Hash aus dem Eingabe, sowie ausgabe Skript erstellt
    let unlocking_script_hash = sha256d(unlocking_script);

    // Speichert alle PublicKeys ab, welche berechtigt sind mittels Signatur die Skripte zu überprüfen
    let verifyed_unlock_public_keys = [];

    // Speichert das Aktuelle Data Stack ab
    let interpr_data_stack = [];

    // Speichert spizielle Zustände des Aktuellen Skriptes ab
    let states = DEFAULT_STATES, needed_sigs = 0;

    // Wird ausgeführt um zu überprüfen ob es sich um ein CHAIN_STATE Wert handelt
    async function next_is_inter_chain_state(hex_str_list, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry !== op_codes.chain_state_value) return false;

        // Es wird geprüft ob es sich um eine gültige ChainState Abfrage handelt
        script_stack_entry = copyed_item.shift();
        if(script_stack_entry === op_codes.cstate_unlock_script_hash) {
            interpr_data_stack.push(new ChainStateValue(unlocking_script_hash));
            return copyed_item;
        }
        else if(script_stack_entry === op_codes.cstate_current_block_hight) {
            interpr_data_stack.push(new ChainStateValue(c_block_hight));
            return copyed_item;
        }
        else throw new Error('Invalid script')
    };

    // Wird ausgeführt um zu überprüfen ob es sich um einen Hex String handelt
    async function next_is_inter_hex_str(hex_str_list, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry !== op_codes.op_code_hex_value) return false;

        // Die Größe des Hexwertes wird abgerufen
        script_stack_entry = copyed_item.shift();

        // Die Länge des Hexwertes wird abgerufen
        let hex_str_len = parseInt(script_stack_entry, 16);

        // Es wird geprüft ob die Länge des Hexstringes größer als 256 Zeichen ist
        if(hex_str_len > 256) throw new Error('Invalid script stack');

        // Der String wird aus dem Stack extrahiert
        var hex_str = '';
        while(hex_str.length !== hex_str_len) { hex_str = hex_str + copyed_item.shift(); }
        if(hex_str.length !== hex_str_len) throw new Error('Invalid script stack');

        // Der Hexstring wird in das Y Stack gepusht
        interpr_data_stack.push(new HexString(hex_str));

        // Die neue Daten Liste wird zurückgegeben
        return copyed_item;
    };

    // Die Funktion wird ausgeführt wenn es sich um ein IF Statemant handelt
    async function next_inter_if_function(hex_str_lst, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_if) return false; 

        // Es wird geprüft um was für eine Anweisung es sich handelt
        let if_conditions = copyed_item.shift();
        if(if_conditions !== op_codes.op_match && if_conditions !== op_codes.op_ibigger && if_conditions !== op_codes.op_ismall && if_conditions !== op_codes.op_nmatch) {
            throw new Error('Invalid script');
        }

        // Diese Funktion prüft ob der nächste Wert ein Chainstate, Nummer, String oder Hexwert ist
        const loop_f = async() => {
            // Prüft ob es sich um einen Chainstate Wert handelt
            let chain_state_value = await next_is_inter_chain_state(copyed_item, script_type);
            if(chain_state_value !== false) { copyed_item = chain_state_value; return; }

            // Prüft ob es sich um einen
            let intepr_hex_value = await next_is_inter_hex_str(copyed_item, script_type);
            if(interpr_data_stack !== false) { copyed_item = intepr_hex_value; return; }

            // Es handelt sich um eine Unbeaknnte aufgabe
            throw new Error('Invalid script');
        };

        // Die Schleife wird 2x ausgeführt
        await loop_f(); await loop_f();

        // Es wird geprüft ob 2 Werte auf dem Y Stack liegen
        if(interpr_data_stack.length !== 2) throw new Error('Invalid script');

        // Die Items auf dem Stack werden extrahiert
        let item_a = interpr_data_stack.shift(), item_b = interpr_data_stack.shift();

        // Es wird geprüft, welche Operation durchgeführt werden soll
        let script_stack_result = false;
        if(if_conditions === op_codes.op_match) {
            script_stack_result = compareValues(item_a, item_b);
        }
        else if(if_conditions === op_codes.op_match) {
            
        }
        else if(if_conditions === op_codes.op_match) {
            
        }
        else if(if_conditions === op_codes.op_match) {
            
        }
        else {
            throw new Error('Invalid script');
        }

        // Die Länge des Codeblocks wird ermittelt
        let code_block_len = parseInt([copyed_item.shift(), copyed_item.shift()].join(''), 16);

        // Die Nächsten X Zeichen werden extrahiert
        let x_chars = '';
        while(x_chars.length != code_block_len) { x_chars = x_chars + copyed_item.shift(); }

        // Es wird geprüft ob der Block ausgeführt werden soll
        if(script_stack_result === true) {
            // Der Codeblock wird ausgeführt
            let resva_lst = await interpr_hex_string(x_chars, true);
            if(resva_lst === false) throw new Error('Invalid script');

            // Die neue Liste wird zurückgegeben
            return { hex_str_list:resva_lst.hex_str_list };
        }

        // Gibt die Ergebnisse zurück
        return { hex_str_list:[] };
    };

    // Diese Funktion wird ausgeführt um definerite Öffentliche Schlüssel einzuelesen
    async function next_read_public_key_defination(hex_str_lst, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.public_key_defination) return false;

        // Es wird geprüft ob danach ein zulässiger Alrorithmns kommt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.curve25519) {
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();
            return { hex_str_lst:copyed_item, value:{ type:'curve25519', pkey:full_str } };
        }
        else if(extracted_item === op_codes.secp256k1) {
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();
            return { hex_str_lst:copyed_item, value:{ type:'secp256k1', pkey:full_str } };
        }
        else {
            throw new Error('Invalid script');
        }
    };

    // Wird ausgeführt um zu überprüfen ob als nächstes ein EMIT Call kommt
    async function next_inter_emit_call(hex_str_lst, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird Signalisiert dass das es ich um einen Verifizierungsvorgang handelt
        states.finally_proof = true;

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_is_emit) return false;

        // Die Einzelnen Einträge auf dem Stack werden abgearbeitet
        let reverse_operations = false, n_oper_call = null;
        while(copyed_item.length > 0) {
            // Das Aktuelle Item wird abgerufen
            let current_item = copyed_item.shift();

            // Es wird geprüft ob es sich um einen 'op_algr_poor' handelt
            if(current_item === op_codes.op_algr_poor) {
                let call_opr = async () => { states.finally_proof = true; return null; };
                if(reverse_operations === true && n_oper_call === null) n_oper_call = call_opr
                else call_opr();
                continue;
            }

            // Es wird geprüft ob der Ausgang entsperrt werden soll
            if(current_item === op_codes.op_unlock) {
                let call_opr = async () => { states.output_is_unlocked = true; return null; };
                if(reverse_operations === true && n_oper_call === null) n_oper_call = call_opr
                else call_opr();
                continue;
            }

            // Es wird geprüft ob der Vorgnag beendet werden soll
            if(current_item === op_codes.op_ref) {
                // Es wird geprüft ob beretis ein Reverse Vorgang aktiviert wurde
                if(reverse_operations === true) throw new Error('Invalid script');

                // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
                current_item = copyed_item.shift();
                if(current_item !== op_codes.parren_fnc_cube) throw new Error('Invalid script');

                // Es wird geprüft ob 0 Daten angegeben wurden
                current_item = copyed_item.shift();
                if(current_item !== '00') throw new Error('Invalid script stack');

                // Die Schleife wird abgebrochen
                return { hex_str_list:[] };
            }

            // Es wird geprüft ob es sich um einen Reverse Vorgang handelt
            if(current_item === op_codes.op_n_reserve) {
                // Es wird geprüft ob beretis ein Reverse Vorgang aktiviert wurde
                if(reverse_operations === true) throw new Error('Invalid script');

                reverse_operations = true;
                continue;
            }

            // Es wird geprüft ob die Signaturen geprüft werden sollen
            if(current_item === op_codes.op_verify_sig) {
                let call_opr = async () => {
                    // Speichert die Gesamtzahl aller
                    let total_checks = 0;

                    // Es wird geprüft ob der PublicKey in der ScriptSig Liste vorhanden ist und ob die Signatur korrekt ist
                    for(let script_sigs of scriptSigs) {
                        let found_pkey = false;
                        for(let allowed_pkeys of verifyed_unlock_public_keys) {
                            if(script_sigs.pkey === scriptSigs.pkey) {
                                // Es wird geprüft ob die Signatur korrekt ist
                                found_pkey = true;
                                total_checks++;
                                break;
                            }

                            // Es wird geprüft ob ein PublicKey gefunden wurde, wenn ja wird dieser Vorgang übersprungen
                            if(found_pkey === true) break;
                        }
                    }

                    // Es wird geprüft ob Mindestens X Prüfungen durchgeführt wurden, wenn nicht wird das Skript abgebrochen
                    if(total_checks !== needed_sigs) {
                        states.aborted = true;
                        states.invalid = true;
                        return false;
                    }

                    // Die Operation wurde erfolreich durchgeführt
                    return true;
                };

                // Es wird geprüft ob die Aufgabe sofort aufgesführt werden soll
                if(reverse_operations === true && n_oper_call === null) n_oper_call = call_opr;
                else {
                    if((await call_opr()) !== true) return { hex_str_list:[] };
                }

                // Das Nächste Element wird abgeitet
                continue;
            }

            // Fügt einen neuen Berechtigen Schlüssel in die Verifyer liste hinzu
            if(current_item === op_codes.op_add_verify_key) {
                // Es wird geprüft ob es sich um einen Parren Inner handelt
                current_item = copyed_item.shift();

                // Es wird geprüft ob es sich um einen Parren Inner handelt
                if(current_item !== op_codes.parren_fnc_cube) throw new Error('Invalid script');

                // Die Gesamtzahl aller Parameter wird abgerufen
                let total_items = parseInt(copyed_item.shift(), 16);

                // Es wird geprüft ob 1 Argumente vorhanden sind
                if(total_items !== 1) throw new Error('Invalid script');

                // Es wird geprüft ob als nächsts ein Öffentlicher Schlüssel kommt
                let public_key_declaration = await next_read_public_key_defination(copyed_item, script_type);
                if(public_key_declaration === false) throw new Error('Invalid script');
                copyed_item = public_key_declaration.hex_str_lst;

                // Wird ausgeführt wenn die Funktion ausgeführt wurd
                let call_opr = async () => {
                    verifyed_unlock_public_keys.push(public_key_declaration.value);
                    needed_sigs++;
                };

                // Es wird geprüft ob die Aufgabe sofort aufgesführt werden soll
                if(reverse_operations === true && n_oper_call === null) n_oper_call = call_opr;
                else if(reverse_operations === true && n_oper_call !== null) {
                    await call_opr();
                    await n_oper_call();
                }
                else {
                    if((await call_opr()) !== true) return { hex_str_list:[] };
                }
                continue;
            }

            // Es handelt sich um ein ungültiges Skript
            throw new Error('Invalid script');
        }

        // Die Schleife wird abgebrochen
        return { hex_str_list:[] };
    };

    // Führt ein Hex String aus
    async function interpr_hex_string(hex_string, sub_call=false, script_type=null) {
        // Der String wird in 2 Zeichen aufgedrennt
        let splited_hex_string = hex_string.toLowerCase().match(/.{2}/g);

        // Das Stack wird abgearbeitet bis er leer ist
        while(splited_hex_string.length > 0) {
            // Es wird geprüft ob es sich um einen EMIT Funktionsaufruf handelt
            let sitc_intrpr = await next_inter_if_function(splited_hex_string, script_type);
            if(sitc_intrpr !== false) {
                splited_hex_string = sitc_intrpr.hex_str_list;
                continue;
            }

            // Es wird geprüft ob es sich um einen EMIT Call handelt
            sitc_intrpr = await next_inter_emit_call(splited_hex_string, script_type);
            if(sitc_intrpr !== false) {
                splited_hex_string = sitc_intrpr.hex_str_list;
                continue;
            }

            // Es handelt sich um ein ungültes Skript
            console.log(splited_hex_string)
            throw new Error('Invalid hex script')
        }

        // Die Hexliste wird zurückgegeben
        return { hex_str_list:splited_hex_string };
    };

    // Das Locking Script wird eingelesen
    //await interpr_hex_string(locking_script, false, script_types.LOCKING);

    // Die Statusdaten werden zwischengesepeichert
    //let locking_state = { ...states };
    //states = DEFAULT_STATES;

    // Das Unlocking Script wird ausgeführt
    await interpr_hex_string(unlocking_script, false, script_types.UNLOCKING);

    console.log(states, unlocking_script_hash)
};


// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(#unlocking_script_hash == 94aec4018fba90de7f509a16c5234d563913979e952269b78e787b7107f34972) {
    unlock_output();
}
`;

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key_and_eq_verfiy_signature(
    PublicKey(curve25519, 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57)
);
`;



// Das Skript wird Gelext
lexer(unlocking_script).then(async (r) => {
    let p_unlock_script = await script_token_parser(r);
    await condscript_interpreter("32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57", p_unlock_script);
});