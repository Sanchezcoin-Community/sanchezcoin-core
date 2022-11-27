module.exports = {
    cstate_current_block_hight:             (253).toString(16).padStart(2, '0'),            // Weist dem Interpreter an, die Aktuelle Blockhöhe auszugeben
    public_key_defination:                  (254).toString(16).padStart(2, '0'),            // Informiert den Interpreter dass als nächstes ein Öffentlicher Schlüssel defineirt wird
    chain_state_value:                      (255).toString(16).padStart(2, '0'),            // Informiert den Interpreter dass als nächstes ein ChainState Wert kommt
    op_code_hex_value:                      (1).toString(16).padStart(2, '0'),              // Gibt an das asl nächstes eine 1 Byte Zahl gefolgt von einem Hexwert kommt
    op_add_verify_key:                      (2).toString(16).padStart(2, '0'),              // Weist den Interpreter an einen neuen Öffentlichen Schlüssel auf die Überprüfungslsite zu setzen
    parren_fnc_cube:                        (3).toString(16).padStart(2, '0'),              // Informiert den Interperter dass als nächstes ein Funktions Parren Cube kommt
    op_push_ulscrip:                        (4).toString(16).padStart(2, '0'),              // Fügt den Hash des Unlockscriptes auf dem Stack hinzu
    op_script_abort:                        (5).toString(16).padStart(2, '0'),              // Sinalisiert dem Interpreter dass der Vorgagn abgrochen werden kann
    op_verify_sig:                          (6).toString(16).padStart(2, '0'),              // Weist den Interpert an dass es sich um eine Signatur handelt
    op_push_false:                          (7).toString(16).padStart(2, '0'),              // Fügt ein False auf das Verify Stack
    op_algr_poor:                           (8).toString(16).padStart(2, '0'),              // Weißt den Interpreter an, die nächsten Schritte als Skript Verifizierung anzusehen, dieser Vorgang kann nicht abgerochen werden!
    op_verify_ss:                           (9).toString(16).padStart(2, '0'),              // Bricht das Skript ab, wenn sich auf dem Stack noch mehr als 1 Element befindet
    op_n_reserve:                           (10).toString(16).padStart(2, '0'),             // Dieser OP_CODE weißt den Interpreter an, den nächsten OP zu überspringen bis der Nachfolgende OP_CODE abgearbeitet wurde
    op_if_block:                            (11).toString(16).padStart(2, '0'),             // Informiert den Interperet dass die nächsten 2 Bytes die Größe eines IF Blocks angeben
    op_uint_256:                            (12).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 256 Bit Integer handelt
    op_uint_128:                            (13).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 128 Bit Integer handelt
    op_ibigger:                             (14).toString(16).padStart(2, '0'),             // Gibt an das der Rechte Wert größer als der Linke wert sein muss
    op_uint_64:                             (15).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 64 Bit Integer handelt
    op_uint_32:                             (16).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 32 Bit Integer handelt
    op_uint_16:                             (17).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 16 Bit Integer handelt
    op_is_emit:                             (18).toString(16).padStart(2, '0'),             // Informiert den Interprert dass die Nächste Funtkion eine EMIT Funktion ist
    curve25519:                             (19).toString(16).padStart(2, '0'),             // Informiert den Interpeter dass es sich um einen Curve25519 PublicKey handelt
    op_ismall:                              (20).toString(16).padStart(2, '0'),             // Gibt an dass die nächsten Zwei Felderwerte überprüft werden sollen
    op_nmatch:                              (21).toString(16).padStart(2, '0'),             // Informiert den Interprert dass es sich um einen Secp256k1 PublicKey handelt
    secp256k1:                              (22).toString(16).padStart(2, '0'),             // Informiert den Interprert dass es sich um einen Secp256k1 PublicKey handelt
    op_uint_8:                              (23).toString(16).padStart(2, '0'),             // Gibt an dass es sich um ein 8 Bit Integer handelt
    op_nsame:                               (24).toString(16).padStart(2, '0'),             // Gibt an dass die nächsten Zwei Felderwerte überprüft werden sollen
    op_match:                               (25).toString(16).padStart(2, '0'),             // Gibt an dass die nächsten Zwei Felderwerte überprüft werden sollen
    op_ref:                                 (26).toString(16).padStart(2, '0'),             // Signalisiert dem Interperer dass das Skript fertig ist und nun die äußere Verifizeirung durchgeführt werden kann
    op_if:                                  (27).toString(16).padStart(2, '0'),             // Siganlisiert dem Interperer dass es sich um eine IF Anweisung handelt
}
