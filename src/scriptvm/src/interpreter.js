const { ChainStateValue, HexString, NumberValue, BoolValue, HashValue, NullValue, compareValues } = require('./obj_types');
const blockchain_crypto = require('blckcrypto');
const { createHash } = require('node:crypto');
const { op_codes } = require('./opcodes');
let { bech32 } = require('bech32');
const web3 = require('web3');


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
    script_sig_is_closed:false,
    needs_sigs:BigInt(0),
    unlocked:false,
    aborted:false,
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
const hexed_script_interpreter = async(locking_script, unlocking_script, c_block_hight=0, script_sigs=[], input_fq_hashes=[], output_fq_hashes=[], script_hight=0, ...optdata) => {
    // Es wird geprüft ob es sich bei den Skripten um Hexwerte handelt
    if(is_validate_hex_str(locking_script) !== true || is_validate_hex_str(unlocking_script) !== true) throw new Error('Invalid script data');

    // Es wird ein Hash aus dem Eingabe, sowie ausgabe Skript erstellt
    let unlocking_script_hash = sha256d(unlocking_script), locking_script_hash = sha256d(locking_script), last_block_hash = "";

    // Speichert alle PublicKeys ab, welche berechtigt sind mittels Signatur die Skripte zu überprüfen
    let allowed_public_key_array = [];

    // Speichert das Aktuelle Data Stack ab
    let y_stack_array = [];

    // Speichert spizielle Zustände des Aktuellen Skriptes ab
    let states = { ...DEFAULT_STATES };

    // Wird ausgeführt wenn das Skript aufgrund eines Fehlers abgebrochen werden soll
    function close_by_error(exception_text) {
        console.log(exception_text);
        states.aborted = true;
    };

    // Gibt an ob die Ausführung des Skriptes abgebrochen wurde
    function script_running_aborted() {
        if(states.exit === true || states.aborted === true) return true;
        else return false;
    };

    // Gibt den LockUnlock Hash aus
    function get_lock_unlock_hash(last_value_hash) {
        let pre_image_input_hash = blockchain_crypto.sha3(256, ...input_fq_hashes);
        let pre_image_output_hash = blockchain_crypto.sha3(256, ...output_fq_hashes);
        let final_sign_hash = blockchain_crypto.sha3(256, pre_image_input_hash, pre_image_output_hash, last_value_hash, script_hight);
        return final_sign_hash;
    };

    // Wird verwendet um die Verwendeten Signaturen zu überprüfen
    async function validate_unlockscript_sig() {
        // Es wird geprüft ob mehr Signaturen als PublicKeys vorhanden sind
        if(script_sigs.length > allowed_public_key_array.length) return false;

        // Es wird geprüft für welche PublicKeys eine Signatur vorhanden ist
        let avail_pkey_signatures = [];
        for(let otems of script_sigs) {
            // Es wird geprüft ob es eine Passende Signatur zu dem Öffentlichen Schlüssel gibt
            let found_pkey = false;
            for(let pair2 of allowed_public_key_array) {
                if(pair2.pkey === otems.pkey) {
                    avail_pkey_signatures.push(otems);
                    found_pkey = true;
                    break;
                }
            }

            // Der Vorgang wird abgebrochen, es wurde kein passender Schlüssel gefunden
            if(found_pkey === false) return false;
        }

        // Es wird geprüft ob die Benötigte Mindestanzahl von Signaturen vorhanden ist
        if(BigInt(avail_pkey_signatures.length) !== BigInt(script_sigs.length)) { return false; }

        // Es wird geprüft ob die Benötigte Anzahl von Signaturen vorhanden sind
        if(BigInt(allowed_public_key_array.length) < states.needs_sigs) throw new Error('Not needed Sigs');

        // Die Öffentlichen Schlüssel werden Sortiert
        let sorted_key_pairs = avail_pkey_signatures.sort((a, b) => {
            let pkey_hash_a = blockchain_crypto.sha3(256, a.pkey, a.type), pkey_hash_b = blockchain_crypto.sha3(256, b.pkey, b.type);
            let pkey_hash_num_a = BigInt(`0x${pkey_hash_a}`), pkey_hash_num_b = BigInt(`0x${pkey_hash_b}`);
            if(pkey_hash_num_a > pkey_hash_num_b) return 1;
            if(pkey_hash_num_a < pkey_hash_num_b) return -1;
            return 0;
        });

        // Die Signaturen werden geprüft
        let last_unlocking_script_hash_signature = '0000000000000000000000000000000000000000000000000000000000000000';
        for(let sig_key_pairs of sorted_key_pairs) {
            let pre_image = get_lock_unlock_hash(last_unlocking_script_hash_signature);
            last_unlocking_script_hash_signature = blockchain_crypto.sha3(256, pre_image, sig_key_pairs.pkey);
            //console.log(last_unlocking_script_hash_signature);
            states.verify_sig_checked++;
        }

        // Es handelt sich um ein gültiges Skript
        return true;
    };

    // Wird ausgeführt um zu überprüfen ob es sich um ein CHAIN_STATE Wert handelt
    async function next_is_inter_chain_state(hex_str_list, script_type=null) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_list.length < 2) return false;

        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

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
            return { hex_str_list:copyed_item, value:new ChainStateValue(BigInt(script_sigs.length)) };
        }
        // Gibt die gesamtzahlen aller Signaturen an
        else {
            close_by_error('INVALID_CHAINSTATE_VALUE');
            return false;
        }
    };

    // Wird ausgeführt um zu überprüfen ob es sich um einen Hex String handelt
    async function next_is_inter_hex_str(hex_str_list, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
        if(hex_str_len > 256) {
            close_by_error('INVALID_HEX_STRING_SIZE');
            return false;
        }

        // Der String wird aus dem Stack extrahiert
        var hex_str = '';
        while(hex_str.length !== hex_str_len) { hex_str = hex_str + copyed_item.shift(); }
        if(hex_str.length !== hex_str_len) {
            close_by_error('INVALID_HEX_STRING_REPLIED');
            return false;
        }

        // Die neue Daten Liste wird zurückgegeben
        return { hex_str_list:copyed_item, value:new HexString(hex_str) };
    };

    // Diese Funktion wird verwendet um eine Zahl einzulesen
    async function next_read_number(hex_str_lst) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
            close_by_error('INVALID_FUNCTION_PARREN_VALUE');
            return false;
        };

        // Die Einzelnen Parameter werden ausgewertet
        let readed_parameters = [];
        while(readed_parameters.length !== total_parameters) {
            let arround_functions = await loop_arround_function();
            readed_parameters.push(arround_functions);
        };

        // Gibt die Ürbirgen Daten zurück
        return { hex_str_list:copyed_item, items:readed_parameters};
    };

    // Diese Funktion wird verwendet um eine Value Funktion auszuführen
    async function next_read_value_function(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
        if(readed_parren_cube === false) {
            if(script_running_aborted() === true) return false;
            close_by_error('INVALID_PARREN_CUBE_VALUE');
            return false; 
        }

        // Der Aktuelle Code wird geupdated
        copyed_item = readed_parren_cube.hex_str_list;

        // Es wird geprüft um was für eine Funktion es sich handelt
        if(current_item === op_codes.op_is_one_signer) {
            // Es wird geprüft ob keine Werte in dem Parrn Cube vorhanden sind
            if(readed_parren_cube.items.length !== 0) { close_by_error('FUNCTION_DONT_ALLOWED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new BoolValue(script_sigs.length === 1) };
        }
        // Es wird geprüft ob es sich um eine SHA256d Funktion handelt
        else if(current_item === op_codes.sha256d) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('SHA256D_FUNCTION_NEED_MINIMUM_ONE_VALUE'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = blockchain_crypto.sha2d(256, ...readed_parren_cube.items.map((value) => value.value));

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d') };
        }
        // Es wird geprüft ob es sich um eine SHA3 Funktion handelt
        else if(current_item === op_codes.sha3) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('SHA3_256_NEED_MINIMUM_ONE_PARAMETER'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = blockchain_crypto.sha3(256, ...readed_parren_cube.items.map((value) => value.value));

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'sha256d') };
        }
        // Es wird geprüft ob es sich um einen SwiftyHash handelt
        else if(current_item === op_codes.swiftyH) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length < 1) { close_by_error('SWIFTYH_256_NEED_MINIMUM_ONE_PARAMETER'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            let final_value_hash = blockchain_crypto.swiftyHash(256, ...readed_parren_cube.items.map((value) => value.value));

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(final_value_hash, 'swiftyhash256') };
        }
        // Wird verwendet um den letzten Eintrag vom Y Stack zurückzugeben
        else if(current_item === op_codes.pop_from_y) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('FUNCTION_DONT_ALLOWED_PARAMETERS'); return false; }

            // Die Einzelnen Werte werden zu einem Wer zusammen geführt und gehasht
            if(y_stack_array.length === 0) return { hex_str_list:copyed_item, value:new NullValue() };

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:y_stack_array.shift() };
        }
        // Wird verwendet um die Gesamtzahl aller Signaturen auszugeben
        else if(current_item === op_codes.cstate_total_signatures) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('TOTAL_SIGNERS_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new NumberValue(BigInt(allowed_public_key_array.length)) };
        }
        // Wird verwendet um den Aktuellen Blockhash auszugeben
        else if(current_item === op_codes.cstate_last_block_hash) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('LAST_BLOCK_HASH_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new HashValue(last_block_hash, 'sha256d') };
        }
        // Wird verwendet um die Aktuelle Block Schwierigkeit auszugeben
        else if(current_item === op_codes.cstate_current_pow_diff) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('CURRENT_POW_DIFF_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new NumberValue(last_block_hash) };
        }
        // Wird verwendet um den Hash des Locking Scripts auszugeben
        else if(current_item === op_codes.cstate_lock_script_hash) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('CURRENT_POW_DIFF_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new ChainStateValue(locking_script_hash) };
        }
        // Wird verwendet um den Hash des Locking Scripts auszugeben
        else if(current_item === op_codes.cstate_unlock_script_hash) {
            // Es wird geprüft ob Mindestens 1 Wert auf dem Parameterstack liegt
            if(readed_parren_cube.items.length !== 0) { close_by_error('CURRENT_POW_DIFF_DONT_NEED_PARAMETERS'); return false; }

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item, value:new ChainStateValue(unlocking_script_hash) };
        }
        // Es konnte kein gültiger Befehler gefunden werden
        else {
            throw new Error('Invalid script');
        }
    };

    // Diese Funktion wird verwendet um ein Bool einzulesen
    async function next_read_bool(hex_str_list) {
        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
            if(resva_lst === false) {
                if(script_running_aborted() === true) return false;
                close_by_error('INVALID_PARREN_CUBE_VALUE');
                return false; 
            }
        }

        // Die Übrigen Daten werden zurückgegeben
        return { hex_str_list:copyed_item };
    };

    // Die Funktion wird ausgeführt wenn es sich um ein IF Statemant handelt
    async function next_inter_if_function(hex_str_lst, script_type=null, is_else_if=false, erase=false) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript abgebrochen wurde
        if(script_running_aborted() === true) return false;

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
        let loop_r = 0;
        const loop_f = async() => {
            // Es wird geprüft ob das Skript abgebrochen wurde
            if(script_running_aborted() === true) return;

            // Die Loop Runde wird um 1 Hochgezählt
            loop_r++;

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
            if(script_running_aborted() === true) return;
            if(interpr_value_function !== false) {
                y_stack_array.push(interpr_value_function.value);
                copyed_item = interpr_value_function.hex_str_list;
                return; 
            }

            // Es wird geprüft ob das Skript beendet wurde
            if(script_running_aborted() === true) return;

            // Es handelt sich um eine Unbeaknnte aufgabe
            throw new Error('Invalid script');
        };

        // Die Schleife wird 2x ausgeführt
        await loop_f(); await loop_f();

        // Es wird geprüft ob die Ausführung des Skriptes abgebrochen wurde
        if(script_running_aborted() === true) return { hex_str_list:[], was_used:false, direct:false };

        // Es wird geprüft ob 2 Werte auf dem Y Stack liegen
        if(y_stack_array.length < 2) throw new Error('Invalid script');

        // Die Items auf dem Stack werden extrahiert
        let item_a = y_stack_array.pop(), item_b = y_stack_array.pop();

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
            // Es wird geprüft ob der Code nur gelöscht werden soll
            if(erase === false) {
                // Der Code wird ausgeführt
                let resva_lst = await interpr_hex_string(x_chars, true, script_type);
                if(resva_lst === false) throw new Error('Invalid script');
                return { hex_str_list:resva_lst.hex_str_list, was_used:true, direct:false };
            }
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

            // Es wird geprüft ob das Skript beendet
            if(script_running_aborted() === true) return { hex_str_list:[], was_used:false, direct:false };

            // Es wird geprüft ob es sich um ein ELSE Statement handelt
            else_block_checks = await next_is_else_block(copyed_item, script_type, ((script_stack_result === true) ? true : false));
            if(else_block_checks !== false) {
                copyed_item = else_block_checks.hex_str_list;
                script_stack_result = true;
            }

            // Die Schleife wird beendet, keine der beiden Funktionen war zutreffend
            break;
        };

        // Es wird geprüft ob das Skript beendet wurde
        if(script_running_aborted() === true) return { hex_str_list:[], was_used:false, direct:false };

        // Gibt die Ergebnisse zurück
        return { hex_str_list:copyed_item, was_used:true, direct:false };
    };

    // Diese Funktion wird ausgeführt um definerite Öffentliche Schlüssel einzuelesen
    async function next_read_public_key_defination(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob es sich um ein
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.public_key_defination) return false;

        // Es wird geprüft ob danach ein zulässiger Alrorithmns kommt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.secp256k1_schnorr) {
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();
            return { hex_str_lst:copyed_item, value:{ type:'secp256k1', pkey:full_str } };
        }
        else if(extracted_item === op_codes.curve25519) {
            let full_str = '';
            while(full_str.length !== 64) full_str = full_str + copyed_item.shift();
            return { hex_str_lst:copyed_item, value:{ type:'curve25519', pkey:full_str } };
        }
        else if(extracted_item === op_codes.bls12381) {
            let full_str = '';
            while(full_str.length !== 96) full_str = full_str + copyed_item.shift();
            return { hex_str_lst:copyed_item, value:{ type:'bls12381', pkey:full_str } };
        }
        else {
            throw new Error('Invalid script');
        }
    };

    // Diese Funktion wird ausgeführt um eine definierte Altchain Adresse einzulesen
    async function next_read_altchain_address(hex_str_lst, script_type=null) {
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob es sich um ein
        if(script_running_aborted() === true) return false;

        // Es wird geprüft ob der erste Eintrag auf der Liste vorhanden ist
        if(hex_str_lst.length < 2) return false;

        // Das Item wird Kopiert
        let copyed_item = hex_str_lst.slice();

        // Es wird geprüft ob es sich bei dem ersten Eintrag um eine IF Anweisung handelt
        let extracted_item = copyed_item.shift();
        if(extracted_item !== op_codes.address_defination) return false;

        // Es wird geprüft ob danach ein zulässiger Alrorithmns kommt
        extracted_item = copyed_item.shift();
        if(extracted_item === op_codes.op_btc_address_32) {
            // Die Adresse wird eingelesen
            let full_str = '';
            while(full_str.length !== 66) full_str = full_str + copyed_item.shift();

            // Die Adresse wird wiederhergestellt
            let recoded_address = bech32.encode('bc', Buffer.from(full_str, 'hex'));

            // Die Daten werden zurückgegeben
            return { hex_str_lst:copyed_item, value:{ type:'p2wpkh', pkey:recoded_address } };
        }
        else if(extracted_item === op_codes.op_eth_address) {
            // Die Adresse wird ausgelesen
            let full_str = '0x';
            while(full_str.length !== 42) full_str = full_str + copyed_item.shift();

            // Es wird geprüft ob es sich um eine Ethereum Adresse handelt
            if(web3.utils.isAddress(full_str) !== true) {
                states.aborted = true;
                return false;
            }

            // Die Daten werden zurückgegeben
            return { hex_str_lst:copyed_item, value:{ type:'ethadr', pkey:full_str } };
        }
        else {
            throw new Error('Invalid script');
        }
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
        // Es wird geprüft ob es sich um einen gültigen Skript typen handelt
        if(script_type !== script_types.UNLOCKING && script_type !== script_types.LOCKING) throw new Error('Invalid script');

        // Es wird geprüft ob das Skript beendet wurde
        if(script_running_aborted() === true) return false;

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

            // Es wird geprüft ob die Signaturen korrekt sind
            if((await validate_unlockscript_sig()) !== true) {
                states.aborted = true;
                return { hex_str_list:[] }; 
            }

            // Das Skript wird als Entsperrt Markiert
            y_stack_array.push(SIG_CHECK_TRUE);
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
            if(public_key_declaration === false){
                // Es wird geprüft ob es sich um eine Adresse handelt
                public_key_declaration = await next_read_altchain_address(copyed_item, script_type);
                if(public_key_declaration === false) { console.log('Invalid script 107'); return { hex_str_list:[] }; }
            }

            // Die neue Stackliste wird geschrieben
            copyed_item = public_key_declaration.hex_str_lst;

            // Der Öffentliche Schlüssel wird auf die berechtigten Liste gepackt
            allowed_public_key_array.push(public_key_declaration.value);
            states.needs_sigs++;

            // Die Daten werden zurückgegeben
            return { hex_str_list:copyed_item };
        }
        // Fügt erst einen Öffentlichen Schlüssel hinzu und führt dann eine Signatur prüffung durch
        else if(current_item === op_codes.op_add_pk_sverify) {
            // Es wird geprüft ob bereits ein Öffentlicher Schlüssel auf dem PublicKey Stack liegt
            if(allowed_public_key_array.length !== 0) {
                close_by_error('HAS_ALWAYS_PKEY_ON_NEEDLIST');
                return false;
            }

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
            if(public_key_declaration === false){
                // Es wird geprüft ob es sich um eine Adresse handelt
                public_key_declaration = await next_read_altchain_address(copyed_item, script_type);
                if(public_key_declaration === false) { console.log('Invalid script 107'); return { hex_str_list:[] }; }
            }

            // Die neue Stackliste wird geschrieben
            copyed_item = public_key_declaration.hex_str_lst;

            // Der Öffentliche Schlüssel wird auf die berechtigten Liste gepackt
            allowed_public_key_array.push(public_key_declaration.value);
            states.needs_sigs++;

            /* Die Signaturen werden geprüft */

            // Es wird geprüft ob die Signaturen korrekt sind
            if((await validate_unlockscript_sig()) !== true) {
                states.aborted = true;
                return { hex_str_list:[] }; 
            }

            // Das Skript wird als Entsperrt Markiert
            y_stack_array.push(SIG_CHECK_TRUE);
            states.unlocked = true;

            // Das Skript ist erfolgreich durchgeführt wurden
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
        // Wird ausgeführt um einen Wert auf das Skript zu legen
        else if(current_item === op_codes.op_push_to_y) {
            // Es wird versucht die ParrenCube werte auszulesen
            let push_function_parren = await next_read_parren_cube(copyed_item, script_type);
            if(push_function_parren === false) throw new Error('Invalid script');
            if(push_function_parren.items < 1) throw new Error('Invalid script');

            // Es wird versucht dein Eintrag auf das Stack zu legen
            for(let citem of push_function_parren.items) y_stack_array.push(citem);

            // Die Daten werden zurückgegeben
            return { hex_str_list:push_function_parren.hex_str_list };
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
            if(script_running_aborted() === true) break;

            // Es wird geprüft ob es sich um einen EMIT Call handelt
            sitc_intrpr = await next_inter_emit_call(splited_hex_string, script_type);
            if(sitc_intrpr !== false) {
                splited_hex_string = sitc_intrpr.hex_str_list;
                continue;
            }

            // Es wird geprüft ob das Skript beendet wurde
            if(script_running_aborted() === true) break;

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

        // Es wird geprüft ob der Erste Eintrag des Y Stacks ein True ist
        if(y_stack_array.length > 0) {
            if(y_stack_array[y_stack_array.length - 1] === SIG_CHECK_TRUE) y_stack_array.pop();
            else rule_cheatings++;
        }
        else rule_cheatings++;

        // Es wird geprüft ob bereits gegen eine Regel verstoßen wurde, wenn ja ist das Skript ungültig
        if(rule_cheatings !== 0) {
            return {
                hashes: { unlock_script:unlocking_script_hash, locking_script:locking_script_hash },
                unlocking_script_result:false,
                locking_script_result: false,
                total_unlocked: false,
                needed_sigs:'unkown',
                state:'aborted',
                pkeys:[]
            }
        }

        // Die Statuse werden geupdated
        let unlocking_state = { ...states };
        states = {  }; states = { ...DEFAULT_STATES };

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
            pkeys:allowed_public_key_array,
            hashes: { unlock_script:unlocking_script_hash, locking_script:locking_script_hash },
            unlocking_script_result:unlocking_state.unlocked,
            locking_script_result:locking_state.unlocked,
            total_unlocked: ((rule_cheatings === 0) ?  (unlocking_state.unlocked === true && locking_state.unlocked === true) : false),
            needed_sigs:parseInt(unlocking_state.needs_sigs.toString()),
            state:'done', 
        }
    };

    // Führt beide Skripte aus und gibt die Ergebnisse zurück
    return (await main_ioscript());
};


// Exportiert den Interpreter
module.exports = hexed_script_interpreter;