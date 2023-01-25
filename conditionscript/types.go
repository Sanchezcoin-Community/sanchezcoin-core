package conditionscript

import "math/big"

// Wird verwendet wenn es sich um ein KEY_WORD handelt
type ScriptKeyWord struct {
	KeyWord string
}

// Wird verwendet wenn es sich um eine Funktion handelt
type ScriptFunction struct {
	Cmd string
}

// Wird verwendet wenn es sich um einen Token handelt
type ScriptToken struct {
	Name string
}

// Gibt an dass es sich um einen neue Zeile handelt
var NEW_LINE_TOKEN = ScriptToken{Name: "NEW_LINE"}

// Wird verwendet um extrahierte Token zwischen zu speichern
type TokenArray struct {
	Data []interface{}
}

// Wird verwendet wenn es sich um einen Zahlen Wert handelt
type ScriptNumberValue struct {
	Value big.Int
}

// Wird verwendet wenn es sich um einen Hex Wert handelt
type ScriptHexValue struct {
	Value string
}

// Wird verwendet um daten wie Höhe, Zeile, etc zu übergeben
type Token struct {
	Char   int
	Line   int
	Object interface{}
}

// Wird verwendet um ExtendedDaten anzugeben
type ExtendedDataValue struct {
	Type   string
	fields []string
}

// Gibt die Gelexten Daten zurück
type LexerResult struct {
	Tokens []interface{}
	Lines  int
	Chars  int
}

// Wird verwendet wenn ein String wert abgespeichert wird
type ScriptStringValue struct {
	Id string
}
