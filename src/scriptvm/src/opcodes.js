// Speichert die Werte, String zu Hex ab
let op_codes = {
    chain_state_value:                      (1).toString(16).padStart(2, '0'),              // Informiert den Interpreter dass als nächstes ein ChainState Wert kommt#
    op_code_hex_value:                      (2).toString(16).padStart(2, '0'),              // Gibt an das asl nächstes eine 1 Byte Zahl gefolgt von einem Hexwert kommt
    parren_fnc_cube:                        (3).toString(16).padStart(2, '0'),              // Informiert den Interperter dass als nächstes ein Funktions Parren Cube kommt
    op_script_abort:                        (4).toString(16).padStart(2, '0'),              // Sinalisiert dem Interpreter dass der Vorgagn abgrochen werden kann
    op_push_false:                          (5).toString(16).padStart(2, '0'),              // Fügt ein False auf das Verify Stack
    op_set_n_of_m:                          (6).toString(16).padStart(2, '0'),              // Legt fest, wieviele Signaturen benötigt werden um das Skript zu entsperren
    op_verify_ss:                           (7).toString(16).padStart(2, '0'),              // Bricht das Skript ab, wenn sich auf dem Stack noch mehr als 1 Element befindet
    op_is_emit:                             (8).toString(16).padStart(2, '0'),              // Informiert den Interprert dass die Nächste Funtkion eine EMIT Funktion ist
    op_unlock:                              (9).toString(16).padStart(2, '0'),              // Signalisiert dass der Verwenete ausgang verwendet werden kann
};

// Gibt die Verfügabren Datentypen an
let int_dtype = {
    op_uint_256:                            (9).toString(16).padStart(2, '0'),              // Gibt an dass es sich um ein 256 Bit Integer handelt
    op_uint_128:                            (10).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 128 Bit Integer handelt
    op_uint_64:                             (11).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 64 Bit Integer handelt
    op_uint_32:                             (12).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 32 Bit Integer handelt
    op_uint_16:                             (13).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 16 Bit Integer handelt
    op_uint_8:                              (14).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 8 Bit Integer handelt
};

// Kryptoverfahren
let crypto = {
    public_key_defination:                  (15).toString(16).padStart(2, '0'),             // Informiert den Interpreter dass als nächstes ein Öffentlicher Schlüssel defineirt wird
    op_add_verify_key:                      (16).toString(16).padStart(2, '0'),             // Weist den Interpreter an einen neuen Öffentlichen Schlüssel auf die Überprüfungslsite zu setzen
    op_add_pk_sverify:                      (17).toString(16).padStart(2, '0'),             // Fügt einen Öffentlichen Schlüssel hinzu und überprüft die Signaturen
    op_verify_otpsig:                       (18).toString(16).padStart(2, '0'),             // Weist den Interpert an dass es sich um eine Signatur handelt
    op_check_sig:                           (19).toString(16).padStart(2, '0'),             // Wird in einem Locking Skript verwendet um die Signaturen zu überüfen
    curve25519:                             (20).toString(16).padStart(2, '0'),             // Informiert den Interpeter dass es sich um einen Curve25519 PublicKey handelt
    secp256k1:                              (21).toString(16).padStart(2, '0'),             // Informiert den Interprert dass es sich um einen Secp256k1 PublicKey handelt
    bls11381:                               (22).toString(16).padStart(2, '0'),             // Gibt an das als nächstes ein BLS11-381 Schlüssel kommt
    sha256d:                                (23).toString(16).padStart(2, '0'),             // Erzeugt einen SHA256d Hash
    swiftyH:                                (24).toString(16).padStart(2, '0'),             // Erzeugt einen Swifty256 Hash
    sha3:                                   (25).toString(16).padStart(2, '0'),             // Erzeugt einen SHA3_256 Hash
};

// IF Codes
let if_code = {
    op_ibigger:                             (21).toString(16).padStart(2, '0'),             // Gibt an dass die Werte größer sein müseen
    op_ismall:                              (22).toString(16).padStart(2, '0'),             // Gibt an dass die Werte kleiner sein müssen
    op_nmatch:                              (23).toString(16).padStart(2, '0'),             // Gibt an ob es sich nicht um die selben Werte handelt
    op_match:                               (24).toString(16).padStart(2, '0'),             // Gibt an dass es sich um die selben Wert handeln muss
    op_elif:                                (25).toString(16).padStart(2, '0'),             // Signalisiert dem Interprer dass es sich um eine ELSE_IF Anweisung handelt
    op_else:                                (26).toString(16).padStart(2, '0'),             // Signalisiert dem Interprer dass es sich um eine ELSE Anweisung handelt
    op_if:                                  (27).toString(16).padStart(2, '0'),             // Siganlisiert dem Interperer dass es sich um eine IF Anweisung handelt
    false:                                  (28).toString(16).padStart(2, '0'),
    true:                                   (29).toString(16).padStart(2, '0'),
};

// NFT Opcodes
let nft_opcode = {
    block_nft_transfer:                     (30).toString(16).padStart(2, '0'),
};

// Blockchain Statuse
let chain_states = {
    cstate_unlock_scriptsig_pubkey:         (246).toString(16).padStart(2, '0'),            // Gibt den PublicKey des Entsperrskriptes aus
    cstate_current_block_consens:           (247).toString(16).padStart(2, '0'),            // Gibt den Aktuellen Block Konsensus aus
    cstate_current_block_hight:             (248).toString(16).padStart(2, '0'),            // Weist dem Interpreter an, die Aktuelle Blockhöhe auszugeben
    cstate_next_block_consens:              (249).toString(16).padStart(2, '0'),            // Gibt das Consensusverfahren für den Nächsten Block aus
    cstate_unlock_script_hash:              (250).toString(16).padStart(2, '0'),            // Fügt den Hash des Unlockscriptes auf dem Stack hinzu
    cstate_current_posm_diff:               (251).toString(16).padStart(2, '0'),            // Gibt die Schwierigkeit des Stakings an
    cstate_current_pow_diff:                (252).toString(16).padStart(2, '0'),            // Gibt die Aktuelle Schwierigkeit des Minings an
    cstate_lock_script_hash:                (253).toString(16).padStart(2, '0'),            // Fügt den Hash des Unlockscriptes auf dem Stack hinzu
    cstate_current_pow_diff:                (254).toString(16).padStart(2, '0'),            // Gibt die Aktuelle Schwierigkeit an
    cstate_last_block_hash:                 (255).toString(16).padStart(2, '0'),            // Fügt den Hash des letzten Blocks hinzu
};



// Exportiert die Funktionen
module.exports = {
    op_codes:{
        ...op_codes,
        ...int_dtype,
        ...crypto,
        ...if_code,
        ...chain_states,
        ...nft_opcode 
    }
};
