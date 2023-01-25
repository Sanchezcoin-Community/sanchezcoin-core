package conditionscript

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"

	"golang.org/x/crypto/sha3"
)

// Speichert alle Zulässigen Zeichen ab
var avail_allowed_chars = []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "_"}

// Speichert alle Tokens ab
var avail_tokens = []string{"+", "-", "=", "<", ">", "(", ")", ";", ",", "{", "}"}

// Speichert alle Verfügbaren Keywords ab
var avail_key_words = []string{"if", "else", "true", "false", "var"}

// Speichert alle Verfügbaren Funktionen ab
var avail_functions = []string{
	"set_needed_total_signatures",
	"check_unlock_hight_seq",
	"add_public_verify_key",
	"check_unlock_time_seq",
	"verify_sig",
	"abort",
}

// Wird verwendet um zu überprüfen ob der Eingegebene String eine Nummer ist
func is_number(num_str string) bool {
	n_bint := new(big.Int)
	_, ok := n_bint.SetString(num_str, 10)
	return ok
}

// Wird verwendet um zu überprüfen ob ein Hexwert korrekt ist
func is_validate_hex(hex_str string) bool {
	// Es wird geprüft ob die Mindest größe von 2 Bytes erreicht wurde
	if len(hex_str) < 2 {
		return false
	}

	// Es wird geprüft ob der String die Maximale größe von 128 Zeichen überschreitet
	if len(hex_str) > 1024 {
		return false
	}

	// Es wird versucht den Hex String einzulesen
	data, err := hex.DecodeString(hex_str)
	if err != nil {
		return false
	}

	// Es wird geprüft ob die größe der Daten die 64 Bytes überschreitet
	if len(data) > 64 {
		return false
	}

	// Es handelt sich um einen Hex String
	return true
}

// Gibt an ob die auf Extended Daten zugegriffen wird
func is_extended_data_using(str string) bool {
	// Der String wird aufgeteilt
	splited_str := strings.Split(str, ".")

	// Es wird geprüft ob mindestens 2 Werte auf dem Stack liegen
	if len(splited_str) < 2 {
		return false
	}

	// Es wird geprüft dass nicht mehr als 255 Werte auf dem Stack liegen
	if len(splited_str) > 3 {
		return false
	}

	// Es wird geprüft ob es sich bei derm Ersten worten um
	if splited_str[0] == "data" {
		return true
	} else if splited_str[0] == "tx" {
		return true
	} else {
		return false
	}
}

// Wird verwendet um den Aktuellen Token auszugeben
func get_token(token_name string) (ScriptToken, bool) {
	switch strings.ToLower(token_name) {
	case "+":
		return ScriptToken{Name: "PLUS"}, true
	case "-":
		return ScriptToken{Name: "MINUS"}, true
	case "=":
		return ScriptToken{Name: "EVEN"}, true
	case "<":
		return ScriptToken{Name: "LESS_THAN"}, true
	case ">":
		return ScriptToken{Name: "GREATER_THAN"}, true
	case "(":
		return ScriptToken{Name: "BOW_UP"}, true
	case ")":
		return ScriptToken{Name: "BOW_CLOSED"}, true
	case ",":
		return ScriptToken{Name: "COMMA"}, true
	case ";":
		return ScriptToken{Name: "SEMICOLON"}, true
	case "{":
		return ScriptToken{Name: "OPEN_BLOCK"}, true
	case "}":
		return ScriptToken{Name: "CLOSE_BLOCK"}, true
	default:
		return ScriptToken{}, false
	}
}

// Wird verwendet um ein Kexword zu ermitteln
func get_keyword(str_keyw string) (ScriptKeyWord, bool) {
	switch strings.ToLower(str_keyw) {
	case "if":
		return ScriptKeyWord{KeyWord: "IF"}, true
	case "else":
		return ScriptKeyWord{KeyWord: "ELSE"}, true
	case "true":
		return ScriptKeyWord{KeyWord: "TRUE"}, true
	case "false":
		return ScriptKeyWord{KeyWord: "FALSE"}, true
	case "var":
		return ScriptKeyWord{KeyWord: "VARIABLE_DECLARATION"}, true
	default:
		return ScriptKeyWord{}, false
	}
}

// Wird verwendet um eine Funktion zu ermitteln
func get_function(str_fnc string) (ScriptFunction, bool) {
	switch strings.ToLower(str_fnc) {
	case "set_needed_total_signatures":
		return ScriptFunction{Cmd: "set_needed_total_signatures"}, true
	case "check_unlock_hight_seq":
		return ScriptFunction{Cmd: "check_unlock_hight_seq"}, true
	case "add_public_verify_key":
		return ScriptFunction{Cmd: "add_public_verify_key"}, true
	case "check_unlock_time_seq":
		return ScriptFunction{Cmd: "check_unlock_time_seq"}, true
	case "verify_sig":
		return ScriptFunction{Cmd: "verify_sig"}, true
	case "abort":
		return ScriptFunction{Cmd: "abort"}, true
	default:
		return ScriptFunction{}, false
	}
}

// Wird verwendet um einen Extended Wert einzulesen
func get_extended_data(str_func string) (ExtendedDataValue, bool) {
	// Der String wird aufgeteilt
	splited_str := strings.Split(str_func, ".")

	// Es wird geprüft ob mindestens 2 Werte auf dem Stack liegen
	if len(splited_str) < 2 {
		return ExtendedDataValue{}, false
	}

	// Es wird geprüft dass nicht mehr als 255 Werte auf dem Stack liegen
	if len(splited_str) > 3 {
		return ExtendedDataValue{}, false
	}

	// Es wird geprüft ob es sich bei derm Ersten worten um
	if splited_str[0] == "data" {
		base_obj := ExtendedDataValue{Type: "data"}
		for _, item := range splited_str[1:] {
			h := sha3.New224()
			h.Write([]byte("DATA:" + item))
			sum := h.Sum(nil)
			base_obj.fields = append(base_obj.fields, hex.EncodeToString(sum[0:12]))
		}

		return base_obj, true
	} else if splited_str[0] == "tx" {
		base_obj := ExtendedDataValue{Type: "data"}
		for _, item := range splited_str[1:] {
			h := sha3.New224()
			h.Write([]byte("TX:" + item))
			sum := h.Sum(nil)
			base_obj.fields = append(base_obj.fields, hex.EncodeToString(sum[0:12]))
		}

		return base_obj, true
	} else {
		return ExtendedDataValue{}, false
	}
}

// Wird verwendet um eine Nummer einzulesen
func is_read_number(current_filed_str string) (ScriptNumberValue, bool) {
	if is_number(current_filed_str) {
		// Es wird versucht die Nummber einzulesen
		n_bint := new(big.Int)

		// Es wird versucht den String einzulesen
		n, ok := n_bint.SetString(current_filed_str, 10)
		if !ok {
			return ScriptNumberValue{}, false
		}

		// Es wird ein neuer Token Eintrag erzeugt
		return ScriptNumberValue{Value: *n}, true
	} else {
		return ScriptNumberValue{}, false
	}
}

// Wird verwendet um ein Keyword einzulesen
func is_read_keyword(current_filed_str string) (ScriptKeyWord, bool) {
	if Contains(avail_key_words, current_filed_str) {
		ret_key_word, ok := get_keyword(current_filed_str)
		if !ok {
			return ScriptKeyWord{}, false
		}
		return ret_key_word, true
	} else {
		return ScriptKeyWord{}, false
	}
}

// Wird verwendet um eine Funktion einzulesen
func is_read_function(current_filed_str string) (ScriptFunction, bool) {
	if Contains(avail_functions, current_filed_str) {
		ret_key_word, ok := get_function(current_filed_str)
		if !ok {
			return ScriptFunction{}, false
		}
		return ret_key_word, true
	} else {
		return ScriptFunction{}, false
	}
}

// Wird verwendet um einen Hex String einzulesen
func is_read_hex_string(current_filed_str string) (ScriptHexValue, bool) {
	if is_validate_hex(current_filed_str) {
		return ScriptHexValue{Value: current_filed_str}, true
	} else {
		return ScriptHexValue{}, false
	}
}

// Wird verwendet um Extend Daten zugriff einzulesen
func is_read_extended_data(current_filed_str string) (ExtendedDataValue, bool) {
	if is_extended_data_using(current_filed_str) {
		req_extd_data, ok := get_extended_data(current_filed_str)
		if !ok {
			return ExtendedDataValue{}, false
		}
		return req_extd_data, true
	} else {
		return ExtendedDataValue{}, false
	}
}

// Erzeugt einen 24 Bit Hash (diese Funktion verschleiert u.a Variabln namen)
func get_var_name_hash(str string) ScriptStringValue {
	h := sha3.New224()
	h.Write([]byte("VAR:" + str))
	sum := h.Sum(nil)
	return ScriptStringValue{Id: hex.EncodeToString(sum[0:12])}
}

// Wird verwendet um ein Script zu Lexen
func LexScriptString(script_str string) (LexerResult, error) {
	// Es wird geprüft ob das Skript größer als 16KB ist
	if len(script_str) > 100000 {
		return LexerResult{}, fmt.Errorf("LexScriptString: script is to big")
	}

	// Der String wird verkleinert
	lower_case_str := strings.ToLower(script_str)

	// Der String wird aufgeteilt
	splited_str := strings.Split(lower_case_str, "")

	// Speichert alle Daten ab, welche während des Verarbeitungsvorganges verwendet wurden oder benötigt werden
	lines, chrs := 0, 0
	tokens := TokenArray{}
	current_filed_str := ""

	// Die Einzelnene Items werden verarbeitet
	for _, s := range splited_str {
		if Contains(avail_tokens, s) {
			// Es wird geprüft ob der Aktuelle Filed String mehr als 1 Zeichen besitzt
			if len(current_filed_str) > 0 {
				if item, ok := is_read_number(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_keyword(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_function(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_hex_string(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_extended_data(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: get_var_name_hash(current_filed_str)})
				}
			}

			// Der Aktuelle Token wird abgerufen
			retrived_token, ok := get_token(s)
			if !ok {
				return LexerResult{}, fmt.Errorf("LexScriptString: unkown error, no validate token")
			}

			// Der Aktuelle Filed String wird zurückgesetzt
			current_filed_str = ""

			// Der Toke wird zwischengespeichert
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: retrived_token})
		} else if Contains([]string{"\n", "\r", " ", "\t"}, s) {
			// Es wird geprüft ob der Aktuelle Filed String mehr als 1 Zeichen besitzt
			if len(current_filed_str) > 0 {
				if item, ok := is_read_number(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_keyword(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_function(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_hex_string(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else if item, ok := is_read_extended_data(current_filed_str); ok {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
				} else {
					tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: get_var_name_hash(current_filed_str)})
				}
			}

			// Es wird bei bedarf eine Zeile hochgezählt
			if s == "\n" {
				tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: NEW_LINE_TOKEN})
				chrs = -1
				lines++
			} else if s == "\r" {
				tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: NEW_LINE_TOKEN})
				chrs = -1
				lines++
			}

			// Der Aktuelle Filed String wird zurückgesetzt
			current_filed_str = ""
		} else if s == "." {
			s_current_field := strings.Split(current_filed_str, ".")
			if len(s_current_field) < 1 {
				return LexerResult{}, fmt.Errorf("LexScriptString: invalid value")
			}

			if s_current_field[0] == "data" {
				current_filed_str += "."
			} else if s_current_field[0] == "tx" {
				current_filed_str += "."
			} else {
				return LexerResult{}, fmt.Errorf("LexScriptString: invalid runtime value pattern %s", current_filed_str)
			}
		} else if is_number(s) {
			current_filed_str = current_filed_str + s
		} else if Contains(avail_allowed_chars, s) {
			current_filed_str = current_filed_str + s
		} else {
			return LexerResult{}, fmt.Errorf("LexScriptString: invalid char '%s'", s)
		}

		// Es wird 1 Zeichen nach oben gezhählt
		chrs++
	}

	// Es wird geprüft ob der Aktuelle Filed String mehr als 1 Zeichen besitzt
	if len(current_filed_str) > 0 {
		if item, ok := is_read_number(current_filed_str); ok {
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
		} else if item, ok := is_read_keyword(current_filed_str); ok {
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
		} else if item, ok := is_read_function(current_filed_str); ok {
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
		} else if item, ok := is_read_hex_string(current_filed_str); ok {
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
		} else if item, ok := is_read_extended_data(current_filed_str); ok {
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: item})
		} else {
			tokens.Data = append(tokens.Data, Token{Line: lines, Char: chrs, Object: get_var_name_hash(current_filed_str)})
		}
	}

	// Es wird geprüft ob die größte des Skriptes überschritten wurde
	if len(tokens.Data) > 65536 {
		return LexerResult{}, fmt.Errorf("LexScriptString: script stack is to big")
	}

	// Das Ausgewertete Skript wird zurückgegeben
	return LexerResult{Tokens: tokens.Data, Lines: lines, Chars: chrs}, nil
}
