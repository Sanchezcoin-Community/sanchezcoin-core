const { ChainStateValue, HexString, NumberValue, BoolValue, HashValue, compareValues } = require('./obj_types');
const script_token_parser = require('./parser');
const { createHash } = require('node:crypto');
const { op_codes } = require('./opcodes');
const lexer = require('./lexer');



// Gibt ein True an, dieses True wird nur Zurückgegeben wenn die Signaturen korrekt geprüft wurden
const SIG_CHECK_TRUE = 0;

// Speichert die Möglichen Skripttypen ab
const script_types = {
    LOCKING:0,
    UNLOCKING:1
};

// Speichert die Standardwerte für ein Skript ab
const DEFAULT_STATES = {
    verify_sig_checked:BigInt(0),
    needs_sigs:BigInt(0),
    unlocked:false,
    exit:false
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
const hexed_script_interpreter = async(locking_script, unlocking_script, c_block_hight=0, scriptSigs=[], ...optdata) => {
    // Es wird geprüft ob es sich bei den Skripten um Hexwerte handelt
    if(is_validate_hex_str(locking_script) !== true) throw new Error('Invalid script data');

    // Es wird ein Hash aus dem Eingabe, sowie ausgabe Skript erstellt
    let unlocking_script_hash = sha256d(unlocking_script), locking_script_hash = sha256d(locking_script);

    // Speichert alle PublicKeys ab, welche berechtigt sind mittels Signatur die Skripte zu überprüfen
    let allowed_public_key_array = [];

    // Speichert das Aktuelle Data Stack ab
    let y_stack_array = [];

    // Speichert spizielle Zustände des Aktuellen Skriptes ab
    let states = { ...DEFAULT_STATES };

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

        // Gibt den Hash des Unlock Scripts aus
        script_stack_entry = copyed_item.shift();
        if(script_stack_entry === op_codes.cstate_unlock_script_hash) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Gibt den Hash des Locking Skripts aus
        else if(script_stack_entry === op_codes.cstate_lock_script_hash) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(locking_script_hash) };
        }
        // Gibt die Aktuelle Blockhöhe an
        else if(script_stack_entry === op_codes.cstate_current_block_hight) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(c_block_hight) };
        }
        // Gibt den Hash des letzten Blocks aus
        else if(script_stack_entry === op_codes.cstate_last_block_hash) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Gibt das Konsensusverfahren des Aktuellen Blocks an
        else if(script_stack_entry === op_codes.cstate_current_block_consens) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Gibt das Konsensusverfahren für den nächsten Block an
        else if(script_stack_entry === op_codes.cstate_next_block_consens) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Gibt die Aktuelle Mining Schwierigkeit an
        else if(script_stack_entry === op_codes.cstate_current_pow_diff) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Gibt die Aktuelle Staking Schwierigkeit an
        else if(script_stack_entry === op_codes.cstate_current_posm_diff) {
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Gibt die Anzahl der Signaturen aus
        else if(script_stack_entry === op_codes.cstate_total_signatures) {
            let total_bint = BigInt(scriptSigs.length);
            return { hex_str_list:copyed_item, value:new ChainStateValue(total_bint) };
        }
        // Gibt die gesamtzahlen aller Signaturen an
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

        // Die neue Daten Liste wird zurückgegeben
        return { hex_str_list:copyed_item, value:new HexString(hex_str) };
    };

    // Diese Funktion wird verwendet um eine Zahl einzulesen
    async function next_read_number(hex_str_lst) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 1) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_uint_8) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 2);

            // Wandelt den Hexwert in eine Zahl um
            let reconstructed_int = new NumberValue(BigInt(extracted.value));

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:reconstructed_int };
        }
        else if(extracted_item === op_codes.op_uint_16) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 4);

            // Wandelt den Hexwert in eine Zahl um
            let reconstructed_int = new NumberValue(BigInt(extracted.value));

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:reconstructed_int };
        }
        else if(extracted_item === op_codes.op_uint_32) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 8);

            // Wandelt den Hexwert in eine Zahl um
            let reconstructed_int = new NumberValue(BigInt(extracted.value));

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:reconstructed_int };
        }
        else if(extracted_item === op_codes.op_uint_64) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 16);

            // Wandelt den Hexwert in eine Zahl um
            let reconstructed_int = new NumberValue(BigInt(extracted.value));

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:reconstructed_int };
        }
        else if(extracted_item === op_codes.op_uint_128) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 32);

            // Wandelt den Hexwert in eine Zahl um
            let reconstructed_int = new NumberValue(BigInt(extracted.value));

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:reconstructed_int };   
        }
        else if(extracted_item === op_codes.op_uint_256) {
            // Der Nächste Eintrag wird aus dem Stack Extrahiert
            let extracted = await extract_n2_bytes(copyed_item, 64);

            // Wandelt den Hexwert in eine Zahl um
            let reconstructed_int = new NumberValue(BigInt(extracted.value));

            // Die Zahl und das neue Stack wird zurückgegeben
            return { hex_str_list:extracted.hex_str_list, int_value:reconstructed_int };
        }
        else {
            return false;
        }
    };

    // Wird verwendet um ParrentCube Werte auszuwerten
    async function next_read_parren_cube(hex_str_lst, script_type) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.parren_fnc_cube) return false;

        // Die Anzahl der Verfügbaren Parameter werden extrahiert
        let total_parameters = parseInt(`0x${copyed_item.shift()}`);

        // Diese Funktion prüft ob der nächste Wert ein Chainstate, Nummer, String oder Hexwert ist
        const loop_arround_function = async() => {
            // Prüft ob es sich um einen Chainstate Wert handelt
            let chain_state_value = await next_is_inter_chain_state(copyed_item, script_type);
            if(chain_state_value !== false) {
                copyed_item = chain_state_value.hex_str_list;
                return chain_state_value.value;
            }

            // Prüft ob es sich um einen
            let intepr_hex_value = await next_is_inter_hex_str(copyed_item, script_type);
            if(intepr_hex_value !== false) {
                copyed_item = intepr_hex_value.hex_str_list;
                return intepr_hex_value.value; 
            }

            // Prüft ob es sich um eine Nummer handelt
            let intepr_number_value = await next_read_number(copyed_item);
            if(intepr_number_value !== false) {
                copyed_item = intepr_number_value.hex_str_list;
                return intepr_number_value.int_value; 
            }

            // Prüft ob es sich um ein Boolean Handelt
            let interpr_bool_value = await next_read_bool(copyed_item);
            if(interpr_bool_value !== false) {
                copyed_item = interpr_bool_value.hex_str_list;
                return interpr_bool_value.bool_value; 
            }

            // Es wird geprüft ob es sich um eine Value Funktion handelt
            let interpr_value_function = await next_read_value_function(copyed_item, script_type);
            if(interpr_value_function !== false) {
                copyed_item = interpr_value_function.hex_str_list;
                return interpr_value_function.value; 
            }

            // Es handelt sich um eine Unbeaknnte aufgabe
            throw new Error('Invalid script');
        };

        // Die Einzelnen Parameter werden ausgewertet
        let readed_parameters = [];
        while(readed_parameters.length !== total_parameters) {
            let arround_functions = await loop_arround_function();
            readed_parameters.push(arround_functions);
        }

        // Gibt die Ürbirgen Daten zurück
        return { hex_str_list:copyed_item, items:readed_parameters};
    };

    // Diese Funktion wird verwendet um eine Value Funktion auszuführen
    async function next_read_value_function(hex_str_lst, script_type=null, return_value=false) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_value_function) return false;

        // Der Aktuelle Wert wird abgerufen
        let current_item = copyed_item.shift();

        // Wird verwendet um die Parren Cube Werte einzulesen
        let readed_parren_cube = await next_read_parren_cube(copyed_item, script_type);
        if(readed_parren_cube === false) throw new Error('Invalid script'); 
        copyed_item = readed_parren_cube.hex_str_list;

        // Es wird geprüft um was für eine Funktion es sich handelt
        if(current_item === op_codes.op_is_one_signer) {
            // Es wird geprüft ob keine Werte in dem Parrn Cube vorhanden sind
            if(readed_parren_cube.items.length !== 0) throw new Error('Invalid script');

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new BoolValue(scriptSigs.length === 1) };
        }
        // Es wird geprüft ob es sich um eine SHA256d Funktion handelt
        else if(current_item === op_codes.sha256d) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(copyed_item.length < 1) throw new Error('Invalid script');

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = sha256d(readed_parren_cube.items.map((value) => value.value).join(''));

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d') };
        }
        // Es wird geprüft ob es sich um eine SHA3 Funktion handelt
        else if(current_item === op_codes.sha3) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(copyed_item.length < 1) throw new Error('Invalid script');

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = sha256d(readed_parren_cube.items.map((value) => value.value).join(''));

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d') };
        }
        // Es wird geprüft ob es sich um einen SwiftyHash handelt
        else if(current_item === op_codes.swiftyH) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(copyed_item.length < 1) throw new Error('Invalid script');

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = sha256d(readed_parren_cube.items.map((value) => value.value).join(''));

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d') };
        }
        // Es konnte kein gültiger Befehler gefunden werden
        else {
            throw new Error('Invalid script');
        }
    };

    // Diese Funktion wird verwendet um ein Bool einzulesen
    async function next_read_bool(hex_str_list) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry === op_codes.true) {
            let reconstructed_bool = new BoolValue(true);
            return { hex_str_list:copyed_item, bool_value:reconstructed_bool };
        }
        else if(script_stack_entry === op_codes.false) {
            let reconstructed_bool = new BoolValue(false);
            return { hex_str_list:copyed_item, bool_value:reconstructed_bool };
        }
        else {
            return false;
        }
    };

    // Diese Funktion wird verwendet um ein ELSE Block auszulesen
    async function next_is_else_block(hex_str_list, script_type=null, erase=false) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_list.slice();

        // Der Nächste Eintrag vom SkriptStack (S) genommen und ausgewertet
        let script_stack_entry = copyed_item.shift();

        // Es wird geprüft, um was für einen ChainState wert es sich handelt
        if(script_stack_entry !== op_codes.op_else) return false;

        // Die Länge des Codeblocks wird ermittelt
        let code_block_len = parseInt([copyed_item.shift(), copyed_item.shift()].join(''), 16);

        // Die Nächsten X Zeichen werden extrahiert
        let x_chars = '';
        while(x_chars.length != code_block_len) { x_chars = x_chars + copyed_item.shift(); }

        // Die Daten werden Interpretiert
        if(erase === false) {
            let resva_lst = await interpr_hex_string(x_chars, true, script_type);
            if(resva_lst === false) throw new Error('Invalid script');
        }

        // Die Übrigen Daten werden zurückgegeben
        return { hex_str_list:copyed_item };
    };

    // Die Funktion wird ausgeführt wenn es sich um ein IF Statemant handelt
    async function next_inter_if_function(hex_str_lst, script_type=null, is_else_if=false, erase=false) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 4) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(is_else_if === true) {
            if(extracted_item !== op_codes.op_elif) return false;
        }
        else {
            if(extracted_item !== op_codes.op_if) return false;
        }

        // Es wird geprüft um was für eine Anweisung es sich handelt
        let if_conditions = copyed_item.shift();
        if(if_conditions !== op_codes.op_match && if_conditions !== op_codes.op_ibigger && if_conditions !== op_codes.op_ismall && if_conditions !== op_codes.op_nmatch) {
            throw new Error('Invalid script');
        }

        // Diese Funktion prüft ob der nächste Wert ein Chainstate, Nummer, String oder Hexwert ist
        const loop_f = async() => {
            // Prüft ob es sich um einen Chainstate Wert handelt
            let chain_state_value = await next_is_inter_chain_state(copyed_item, script_type);
            if(chain_state_value !== false) {
                y_stack_array.push(chain_state_value.value);
                copyed_item = chain_state_value.hex_str_list;
                return; 
            }

            // Prüft ob es sich um einen
            let intepr_hex_value = await next_is_inter_hex_str(copyed_item, script_type);
            if(intepr_hex_value !== false) {
                y_stack_array.push(intepr_hex_value.value);
                copyed_item = intepr_hex_value.hex_str_list;
                return; 
            }

            // Prüft ob es sich um eine Nummer handelt
            let intepr_number_value = await next_read_number(copyed_item);
            if(intepr_number_value !== false) {
                y_stack_array.push(intepr_number_value.int_value);
                copyed_item = intepr_number_value.hex_str_list;
                return; 
            }

            // Prüft ob es sich um ein Boolean Handelt
            let interpr_bool_value = await next_read_bool(copyed_item);
            if(interpr_bool_value !== false) {
                y_stack_array.push(interpr_bool_value.bool_value);
                copyed_item = interpr_bool_value.hex_str_list;
                return; 
            }

            // Es wird geprüft ob es sich um eine Value Funktion handelt
            let interpr_value_function = await next_read_value_function(copyed_item, script_type);
            if(interpr_value_function !== false) {
                y_stack_array.push(interpr_value_function.value);
                copyed_item = interpr_value_function.hex_str_list;
                return; 
            }

            // Es handelt sich um eine Unbeaknnte aufgabe
            throw new Error('Invalid script');
        };

        // Die Schleife wird 2x ausgeführt
        await loop_f(); await loop_f();

        // Es wird geprüft ob 2 Werte auf dem Y Stack liegen
        if(y_stack_array.length !== 2) {
            console.log('ERROR', y_stack_array);
            throw new Error('Invalid script');
        }

        // Die Items auf dem Stack werden extrahiert
        let item_a = y_stack_array.shift(), item_b = y_stack_array.shift();

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
            let resva_lst = await interpr_hex_string(x_chars, true, script_type);
            if(resva_lst === false) throw new Error('Invalid script');
            return { hex_str_list:resva_lst.hex_str_list, was_used:true, direct:false };
        }

        // Es wird geprüft ob es sich um einen ELSE_IF Block handelt
        if(is_else_if === true) {
            return { hex_str_list:copyed_item, was_used:false, direct:false };
        }

        // Die Schleife wird solange ausgeführt, bis kein ELSE_IF mehr kommt oder ein ELSE kommt oder nichts von beiden
        while(copyed_item.length > 0) {
            // Es wird geprüft ob es sich um einen ELSE_IF Statement handelt
            let else_block_checks = await next_inter_if_function(copyed_item, script_type, true, ((script_stack_result === true) ? true : false));
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
                continue;
            }

            // Es wird geprüft ob es sich um ein ELSE Statement handelt
            else_block_checks = await next_is_else_block(copyed_item, script_type, ((script_stack_result === true) ? true : false));
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
            }

            // Die Schleife wird beendet, keine der beiden Funktionen war zutreffend
            break;
        };

        // Gibt die Ergebnisse zurück
        return { hex_str_list:copyed_item, was_used:true, direct:false };
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

    // Diese Funktion wird ausgeführt um definierte Adressen von Bitcoin oder Ethereum einzulesen
    async function next_read_blockchain_address_defination(hex_str_lst, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.public_key_defination) return false;
    };

    // Wird verwendet um Zusammenhängende Daten zu Extrahieren
    async function extract_n2_bytes(hex_str_lst, byte_size) {
        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Die Schleife wird ausgeführt
        let array_sz = ``;
        while(array_sz.length < byte_size) array_sz += copyed_item.shift();

        // Die Daten werden zurückgegeben
        return { hex_str_list:copyed_item, value:array_sz };
    };

    // Wird ausgeführt um zu überprüfen ob als nächstes ein EMIT Call kommt
    async function next_inter_emit_call(hex_str_lst, script_type=null) {
        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 3) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.op_is_emit) return false;

        // Das Aktuelle Item wird abgerufen
        let current_item = copyed_item.shift();

        // Es wird geprüft ob der Ausgang entsperrt werden soll
        if(current_item === op_codes.op_unlock) {
            // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
            current_item = copyed_item.shift();
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 1'); return { hex_str_list:[] }; }

            // Es wird geprüft ob 0 Daten angegeben wurden
            current_item = copyed_item.shift();
            if(current_item !== '00') { console.log('Invalid script 2'); return { hex_str_list:[] }; }

            // Die Ausgabe wird freigegeben
            y_stack_array.push(SIG_CHECK_TRUE);
            states.unlocked = true;

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item };
        }
        // Es wird geprüft ob die Signaturen geprüft werden sollen
        else if(current_item === op_codes.op_check_sig) {
            // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
            current_item = copyed_item.shift();
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 3'); return { hex_str_list:[] }; }

            // Es wird geprüft ob 0 Daten angegeben wurden
            current_item = copyed_item.shift();
            if(current_item !== '00') { console.log('Invalid script 4'); return { hex_str_list:[] }; }

            // Es wird Signalisiert das eine Signaturprüfung durchgeführt wurde
            states.verify_sig_checked++;

            // Das Skript wird als Entsperrt Markiert
            states.unlocked = true;

            // Das Skript ist erfolgreich durchgeführt wurden
            return { hex_str_list:copyed_item };
        }
        // Fügt einen neuen Berechtigen Schlüssel in die Verifyer liste hinzu
        else if(current_item === op_codes.op_add_verify_key) {
            // Es wird geprüft ob es sich um einen Parren Inner handelt
            current_item = copyed_item.shift();

            // Es wird geprüft ob es sich um einen Parren Inner handelt
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 5'); return { hex_str_list:[] }; }

            // Die Gesamtzahl aller Parameter wird abgerufen
            let total_items = parseInt(copyed_item.shift(), 16);

            // Es wird geprüft ob 1 Argumente vorhanden sind
            if(total_items !== 1) { console.log('Invalid script 6'); return { hex_str_list:[] }; }

            // Es wird geprüft ob als nächsts ein Öffentlicher Schlüssel kommt
            let public_key_declaration = await next_read_public_key_defination(copyed_item, script_type);
            if(public_key_declaration === false) { console.log('Invalid script 7'); return { hex_str_list:[] }; }
            copyed_item = public_key_declaration.hex_str_lst;

            // Der Öffentliche Schlüssel wird auf die berechtigten Liste gepackt
            allowed_public_key_array.push(public_key_declaration.value);
            states.needs_sigs++;

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item };
        }
        // Fügt erst einen Öffentlichen Schlüssel hinzu und führt dann eine Signatur prüffung durch
        else if(current_item === op_codes.op_add_pk_sverify) {
            /* Die Öffentlichen Schlüssel werden hinzugefügt */

            // Es wird geprüft ob es sich um einen Parren Inner handelt
            current_item = copyed_item.shift();

            // Es wird geprüft ob es sich um einen Parren Inner handelt
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 8'); return { hex_str_list:[] }; }

            // Die Gesamtzahl aller Parameter wird abgerufen
            let total_items = parseInt(copyed_item.shift(), 16);

            // Es wird geprüft ob 1 Argumente vorhanden sind
            if(total_items !== 1) { console.log('Invalid script 9'); return { hex_str_list:[] }; }

            // Es wird geprüft ob als nächsts ein Öffentlicher Schlüssel kommt
            let public_key_declaration = await next_read_public_key_defination(copyed_item, script_type);
            if(public_key_declaration === false) { console.log('Invalid script 10'); return { hex_str_list:[] }; }
            copyed_item = public_key_declaration.hex_str_lst;

            // Der Öffentliche Schlüssel wird auf die berechtigten Liste gepackt
            allowed_public_key_array.push(public_key_declaration.value);
            states.needs_sigs++;

            /* Die Signaturen werden geprüft */

            // Speichert die Gesamtzahl aller
            let total_checks = 1;

            // Es wird geprüft ob der PublicKey in der ScriptSig Liste vorhanden ist und ob die Signatur korrekt ist
            for(let script_sigs of scriptSigs) {
                let found_pkey = false;
                for(let allowed_pkeys of allowed_public_key_array) {
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
            if(total_checks !== states.needs_sigs) { console.log('Invalid script 11'); return { hex_str_list:[] }; }

            // Es wird Signalisiert das eine Signaturprüfung durchgeführt wurde
            states.verify_sig_checked++;

            // Das Skript wird als Entsperrt Markiert
            states.unlocked = true;

            // Das Skript ist erfolgreich durchgeführt wurden
            y_stack_array.push(SIG_CHECK_TRUE);
            return { hex_str_list:copyed_item };
        }
        // Setzt die Anzahl der Mindestens benötigten Signaturen an
        else if(current_item === op_codes.op_set_n_of_m) {
            // Es wird geprüft ob es sich um einen Parren Inner handelt
            current_item = copyed_item.shift();

            // Es wird geprüft ob es sich um einen Parren Inner handelt
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 12'); return { hex_str_list:[] }; }

            // Die Gesamtzahl aller Parameter wird abgerufen
            let total_items = parseInt(copyed_item.shift(), 16);

            // Es wird geprüft ob 1 Argumente vorhanden sind
            if(total_items !== 1) { console.log('Invalid script 13'); return { hex_str_list:[] }; }

            // Es wird geprüft ob nachfolgend eine Nummer kommt
            let number_read_result = await next_read_number(copyed_item);
            if(number_read_result === false) { console.log('Invalid script 14'); return { hex_str_list:[] }; }
            copyed_item = number_read_result.hex_str_list;

            // Es wird geprüft ob die Zahl größer oder gleich 0 ist
            if(BigInt(0) >= number_read_result.int_value.value) { console.log('Invalid script 15'); return { hex_str_list:[] }; }

            // Es wird geprüft ob die Anzahl der Verfügabren PublicKeys größer ist als die Anzahl der Zulässigen
            if(BigInt(allowed_public_key_array.length) < number_read_result.int_value.value) { console.log('Invalid script 16', allowed_public_key_array.length, number_read_result.int_value.value); return { hex_str_list:[] }; }

            // Die Zahl der benötigten Signaturen wird festgelegt
            states.needs_sigs = number_read_result.int_value.value;

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item };
        }
        // Beendet die ausführung des gesamten Skriptes
        else if(current_item === op_codes.op_exit) {
            // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
            current_item = copyed_item.shift();
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 3'); return { hex_str_list:[] }; }

            // Es wird geprüft ob 0 Daten angegeben wurden
            current_item = copyed_item.shift();
            if(current_item !== '00') { console.log('Invalid script 4'); return { hex_str_list:[] }; }

            // Es wird Signalisiert dass das Skript beendet werden soll
            states.exit = true;

            // Das Skript ist erfolgreich durchgeführt wurden
            return { hex_str_list:[] };
        }
        // Wird ausgeführt wenn das Skript fehlerhaft abgebrochen werden soll
        else if(current_item === op_codes.op_script_abort) {
            // Es wird geprüft ob als nächstes Leere Parent Cubes kommen
            current_item = copyed_item.shift();
            if(current_item !== op_codes.parren_fnc_cube) { console.log('Invalid script 3'); return { hex_str_list:[] }; }

            // Es wird geprüft ob 0 Daten angegeben wurden
            current_item = copyed_item.shift();
            if(current_item !== '00') { console.log('Invalid script 4'); return { hex_str_list:[] }; }

            // Das Skript ist erfolgreich durchgeführt wurden
            return { hex_str_list:[] };
        }
        // Es konnte kein gültiger Befehler gefunden werden
        else {
            throw new Error('Invalid script');
        }
    };

    // Führt ein Hex String aus
    async function interpr_hex_string(hex_string, sub_call=false, script_type=null) {
        // Es wird geprüft ob es sich um einen String handelt
        if(typeof hex_string !== 'string') throw new Error('Invalid data');
        if(hex_string.length < 2) return { hex_str_list:[] };

        // Der String wird in 2 Zeichen aufgedrennt
        let splited_hex_string = hex_string.toLowerCase().match(/.{2}/g);

        // Das Stack wird abgearbeitet bis er leer ist
        while(splited_hex_string.length > 0) {
            // Es wird geprüft ob das Skript beendet wurde
            if(states.exit === true) break;

            // Es wird geprüft ob es sich um einen EMIT Funktionsaufruf handelt
            let sitc_intrpr = await next_inter_if_function(splited_hex_string, script_type);
            if(sitc_intrpr !== false) {
                splited_hex_string = sitc_intrpr.hex_str_list;
                continue;
            }

            // Es wird geprüft ob das Skript beendet wurde
            if(states.exit === true) break;

            // Es wird geprüft ob es sich um einen EMIT Call handelt
            sitc_intrpr = await next_inter_emit_call(splited_hex_string, script_type);
            if(sitc_intrpr !== false) {
                splited_hex_string = sitc_intrpr.hex_str_list;
                continue;
            }

            // Es wird geprüft ob das Skript beendet wurde
            if(states.exit === true) break;

            // Es handelt sich um ein ungültes Skript
            console.log(splited_hex_string)
            throw new Error('Invalid hex script')
        }

        // Die Hexliste wird zurückgegeben
        return { hex_str_list:splited_hex_string };
    };

    // Diese Funktion führt Input sowie Output Script parallel voneinander aus
    async function main_ioscript() {
        // Die Standardwerte werden gesetzt
        states = { ...DEFAULT_STATES };

        // Gibt an, gegen wieiviele Regeln verstoßen wurde
        let rule_cheatings = 0;

        // Das Unlocking Script wird ausgeführt
        await interpr_hex_string(unlocking_script, false, script_types.UNLOCKING);
        let unlocking_state = { ...states };
        states = {  }; states = { ...DEFAULT_STATES };

        // Es wird geprüft ob der Erste Eintrag des Y Stacks ein True ist
        if(y_stack_array.length >= 1) {
            let stack_result = y_stack_array.shift();
            if(stack_result !== SIG_CHECK_TRUE) rule_cheatings++;
        }
        else {
            rule_cheatings++;
        }

        // Es wird geprüft ob bereits gegen eine Regel verstoßen wurde, wenn ja ist das Skript ungültig
        if(rule_cheatings !== 0) {
            console.log('INVALID_SCRIPT', rule_cheatings, y_stack_array);
        }

        // Das Locking Script wird eingelesen
        await interpr_hex_string(locking_script, false, script_types.LOCKING);
        let locking_state = { ...states };
        states = {  }; states = { ...DEFAULT_STATES };

        // Es wird geprüft ob auf dem Y Stack ein True liegt
        if(y_stack_array.length === 1) {
            if(y_stack_array[0] !== SIG_CHECK_TRUE) rule_cheatings++;
        }
        else {
            rule_cheatings++;
        }

        // Das Finale Objekt wird zurückgegeben
        return {
            unlocking_script_result:unlocking_state.unlocked,
            locking_script_result:locking_state.unlocked,
            total_unlocked: ((rule_cheatings === 0) ?  (unlocking_state.unlocked === true && locking_state.unlocked === true) : false),
            needed_sigs:unlocking_state.needs_sigs,
            hashes: {
                unlock_script:unlocking_script_hash,
                locking_script:locking_script_hash
            },
            pkeys:allowed_public_key_array
        }
    };

    // Führt beide Skripte aus und gibt die Ergebnisse zurück
    return (await main_ioscript());
};


// Wird verwendet um eine Ausgabe an bestimmte bedinungen zu knüpfen
let locking_script = `
if(#unlocking_script_hash == 2292c301c0e755aea47d74594098d8600946721c1311dcb54470637ffccbd6db) {
    unlock();
    exit();
}
else {
    exit();
}
`

let locking_script_a = `
if(sha256d(bbdd0eea7ea53876dbe37abadf790956d29d2e17b92b3c81625a0d00424553a9) == 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a9) {
    unlock();
}
`

// Wird verwendet um eine Ausgabe zu Entsperren und nachzuweisen dass man die Benötigen Bediungen erfüllt
let unlocking_script = `
add_verify_key_and_eq_verfiy_signature(
    PublicKey(curve25519, 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57)
);
`

// MultiSig Skript
let unlocking_script2 = `
add_verify_key(PublicKey(curve25519, 32c220482c68413fbf8290e3b1e49b0a85901cfcd62ab0738760568a2a6e8a57));
add_verify_key(PublicKey(curve25519, 50679e3ed1de04949eeccb928ba8b9495aa0613fe17ef127463f98f28def3db3));
set_n_of_m(1);
verify_sig();
unlock();
`

// Das Skript wird Gelext
lexer(unlocking_script2).then(async (script) => {
    let p_unlock_script = await script_token_parser(script);
    let p_lock_script = await lexer(locking_script_a);
    p_lock_script = await script_token_parser(p_lock_script);
    let test_result = await hexed_script_interpreter(p_lock_script, p_unlock_script);
    console.log(test_result)
});