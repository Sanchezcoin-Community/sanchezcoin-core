package conditionscript

// Wird verwendet um zu überprüfen ob sich deine Element auf einer Liste befindet
func Contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}
	return false
}

// Wandelt eine Zahl in HEX Zeichen um
func NmberToLittleIntHex(numv int) string {
	return ""
}
