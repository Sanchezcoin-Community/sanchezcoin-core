package conditionscript

import (
	"errors"
	"fmt"
)

// Speichert alle Daten ab welche für Parsing Vorgang benötigt werden
type ParsingData struct {
	CurrentStack []interface{}
	Variables    map[string]int
}

// Es wird geprüft ob als nächstes ein Script Token vorhanden ist
func next_read_is_script_token(p_data *ParsingData) (ScriptToken, bool) {
	// Es wird geprüft ob Mindestens 1 Element auf dem Stack ist
	if len(p_data.CurrentStack) < 1 {
		return ScriptToken{}, false
	}

	// Das Element wird vom Stack geholt
	next_stack_element, ok := p_data.CurrentStack[0].(Token)
	if !ok {
		return ScriptToken{}, false
	}

	// Die ID der Variable wird eingelesen
	string_value, ok := next_stack_element.Object.(ScriptToken)
	if !ok {
		return ScriptToken{}, false
	}

	p_data.CurrentStack = p_data.CurrentStack[1:]
	return string_value, true
}

// Wird verwendet um zu überprüfen ob als nächstes String auf dem Stack ist
func next_read_is_string(p_data *ParsingData) (ScriptStringValue, bool) {
	// Es wird geprüft ob Mindestens 1 Element auf dem Stack ist
	if len(p_data.CurrentStack) < 1 {
		return ScriptStringValue{}, false
	}

	// Das Element wird vom Stack geholt
	next_stack_element, ok := p_data.CurrentStack[0].(Token)
	if !ok {
		return ScriptStringValue{}, false
	}

	// Die ID der Variable wird eingelesen
	string_value, ok := next_stack_element.Object.(ScriptStringValue)
	if !ok {
		return ScriptStringValue{}, false
	}

	p_data.CurrentStack = p_data.CurrentStack[1:]
	return string_value, true
}

// Wird verwendet um zu überprüfen ob als nächstes ein Hexstring auf dem Stack liegt
func next_read_is_hex_string_value(p_data *ParsingData) (ScriptHexValue, bool) {
	// Es wird geprüft ob Mindestens 1 Element auf dem Stack ist
	if len(p_data.CurrentStack) < 1 {
		return ScriptHexValue{}, false
	}

	// Das Element wird vom Stack geholt
	next_stack_element, ok := p_data.CurrentStack[0].(Token)
	if !ok {
		return ScriptHexValue{}, false
	}

	// Die ID der Variable wird eingelesen
	string_value, ok := next_stack_element.Object.(ScriptHexValue)
	if !ok {
		return ScriptHexValue{}, false
	}

	p_data.CurrentStack = p_data.CurrentStack[1:]
	return string_value, true
}

// Wird verwendet um zu überprüfen ob als nächstes ein Funktionsaufruf durchgeführt werden soll
func next_is_read_function_call(p_data *ParsingData, is_declaration bool) (ScriptFunction, bool) {
	// Es wird geprüft ob Mindestens 1 Element auf dem Stack ist
	if len(p_data.CurrentStack) < 1 {
		return ScriptFunction{}, false
	}

	// Das Element wird vom Stack geholt
	next_stack_element, ok := p_data.CurrentStack[0].(Token)
	if !ok {
		return ScriptFunction{}, false
	}

	// Die ID der Variable wird eingelesen
	string_value, ok := next_stack_element.Object.(ScriptFunction)
	if !ok {
		return ScriptFunction{}, false
	}

	p_data.CurrentStack = p_data.CurrentStack[1:]
	return string_value, true
}

// Wird verwendet um zu überprüfen ob als nächste eine Zahl auf dem Stack vorhanden ist
func next_is_read_number_value(p_data *ParsingData) (ScriptNumberValue, bool) {
	// Es wird geprüft ob Mindestens 1 Element auf dem Stack ist
	if len(p_data.CurrentStack) < 1 {
		return ScriptNumberValue{}, false
	}

	// Das Element wird vom Stack geholt
	next_stack_element, ok := p_data.CurrentStack[0].(Token)
	if !ok {
		return ScriptNumberValue{}, false
	}

	// Die ID der Variable wird eingelesen
	string_value, ok := next_stack_element.Object.(ScriptNumberValue)
	if !ok {
		return ScriptNumberValue{}, false
	}

	p_data.CurrentStack = p_data.CurrentStack[1:]
	return string_value, true
}

// Diese Funktion wird verwendet um zu überprüfen ob als Nächstes eine Variabeln Deklaration kommt
func is_read_var_declar(u_data interface{}, p_data *ParsingData) (string, bool, error) {
	// Es wird versucht das Element einzuleesen
	field, ok := u_data.(ScriptKeyWord)
	if !ok {
		return "", false, nil
	}

	// Es wird geprüft ob es sich um eine Zulässige Variablen Deklaration handelt
	if field.KeyWord != "VARIABLE_DECLARATION" {
		return "", false, nil
	}

	// Es wird geprüft ob als nächstes eine String Deklaration vorhanden ist
	declar_str_id, ok := next_read_is_string(p_data)
	if !ok {
		return "", false, nil
	}

	// Es wird geprüft ob als nächstes ein EVEN Token vorhanden ist
	declar_is, ok := next_read_is_script_token(p_data)
	if !ok {
		return "", false, nil
	}
	if declar_is.Name != "EVEN" {
		return "", false, nil
	}

	// Es wird geprüft ob als nächstes ein Hexwert, eine Zahl oder ein Funktionsaufruf verwendet werden soll um die Variable zu beschreiben
	return_value := ""
	if hex_str, yes := next_read_is_hex_string_value(p_data); yes {
		return_value = hex_str.Value
	} else if function_call, yes := next_is_read_function_call(p_data, true); yes {
		return_value = function_call.Cmd
	} else if function_call, yes := next_is_read_number_value(p_data); yes {
		return_value = function_call.Value.Text(16)
	} else {
		return "", false, nil
	}

	// Es wird geprüft ob

	fmt.Println(declar_is, declar_str_id)
	return return_value, true, nil
}

// Wird verwendet um das Ergebniss eines Lexers in Hexcode umzuwandeln
func ParseTokensToHexScript(lex_result LexerResult, level int) (string, error) {
	// Speichert alle Parsing Daten ab
	current_parsing_data := &ParsingData{CurrentStack: lex_result.Tokens}

	// Speichert den bereits erfolgreich zusammengeseten string ab
	result_string := ""

	for {
		// Es wird geprüft ob die Temporären Daten abgerbeitet wurden, wenn ja wird die Schleife beendet
		if len(current_parsing_data.CurrentStack) < 1 {
			break
		}

		// Das 1 Element auf dem Stack wird abgerufen
		first_stack_element := current_parsing_data.CurrentStack[0]
		current_parsing_data.CurrentStack = current_parsing_data.CurrentStack[1:]

		// Es wird versucht das Element einzuleesen
		field, ok := first_stack_element.(Token)
		if !ok {
			return "", errors.New("ParseTokensToHexScript: Unkown internal error")
		}

		fmt.Printf("%+v\n", field)

		// Es wird geprüft ob als nächstes eine Variablen Deklaration vorhanden ist
		var_result, ok, err := is_read_var_declar(field.Object, current_parsing_data)
		if err != nil {
			return "", err
		}
		if ok {
			result_string += var_result
		}
	}

	return "", nil
}
