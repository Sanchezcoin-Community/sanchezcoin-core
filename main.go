package main

import (
	"fmt"
	"sanchezcoingo/conditionscript"
)

func main() {
	test_script := `var olong = 03042cf8100db386818cee4ff0f2972431a62ed78edbd09ac08accfabbefd818
	validate_data_preimage(e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)

	`

	// Das Skript wird Tokenesiert
	tokens, err := conditionscript.LexScriptString(test_script)
	if err != nil {
		fmt.Println(err)
	}

	// Die Token werden geparst
	conditionscript.ParseTokensToHexScript(tokens, 0)
}
