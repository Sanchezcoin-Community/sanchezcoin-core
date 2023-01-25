package conditionscript

// Wird als Sogenanter OP_CODE verwendet
type OP_CODE struct {
	Name    string
	Hexcode string
}

// Speichert alle OP_CODE ab welche verfügbar sind
var OP_NULL_CODE = OP_CODE{Name: "OP_NULL", Hexcode: NmberToLittleIntHex(0)}
var OP_NEWLINE_CODE = OP_CODE{Name: "OP_NEWLINE_CODE", Hexcode: NmberToLittleIntHex(1)}
var VAR_DECLARATION = OP_CODE{Name: "VAR_DECLARATION", Hexcode: NmberToLittleIntHex(2)}
var OP_HEX_STR_1 = OP_CODE{Name: "OP_HEX_STR", Hexcode: NmberToLittleIntHex(3)}
var OP_HEX_STR_2 = OP_CODE{Name: "OP_HEX_STR", Hexcode: NmberToLittleIntHex(4)}
var OP_EQUALS = OP_CODE{Name: "OP_EQUALS", Hexcode: NmberToLittleIntHex(5)}
var OP_EVEN = OP_CODE{Name: "OP_EVEN", Hexcode: NmberToLittleIntHex(6)}
