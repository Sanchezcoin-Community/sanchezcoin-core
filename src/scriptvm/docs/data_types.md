# **General**
**Condition Script supports multiple data types. Note that the script language does not allow conversion of data types based on OP_CODE. The parser automatically recognizes what kind of data type it is and automatically assigns the value to it.**


# **Address types:**

### **BtcAddress:**
Allows you to use a Bitcoin P2WPKH address within a conditions script.

Example:
```JavaScript
BtcAddress(bc1q42lja79elem0anu8q8s3h2n687re9jax556pcc)
```


### **EthAddress:**
Allows you to use an Ethereum address within a conditions script.

Example:
```JavaScript
EthAddress(0x165cd37b4c644c2921454429e7f9358d18a45e14)
```


# **Public key:**
Use a public secp256k1 Schnorr key within the conditions script.

#### **Types**:
- bls12381s
- secp256k1
- curve25519

Examples:
```JavaScript
PublicKey(secp256k1, 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a2)
PublicKey(curve25519, 384b1332be6666c48dc8b106797b6d6014939df07d6cd8ba369da415520ba3a2) 
PublicKey(bls12381, 86b50179774296419b7e8375118823ddb06940d9a28ea045ab418c7ecbe6da84d416cb55406eec6393db97ac26e38bd4)
```


# **String / Number types:**

### **HexString:**
In Conditions Script it is sufficient to write a hex value freestanding, the interpreter automatically recognizes that it is a hex value.

Example:
```
4b4ce1e31176cbe96603ad7715db977bb5664315fde59866b22295a2e746d95e <- Automatically recognized as a hex string.
```


### **number:**
A number can be specified directly as a number or as a hex value. The smallest possible value is 0 and the largest possible value is 2^256

Example:
```
45 <- Automatically recognized as a number.
0x2B <- Automatically recognized as a number.
```


# **VM-Value types:**

### **hash:**
Used by the script VM to return a hash value.

### **vmnumber:**
Used by the script VM to specify a number.

### **bool:**
Used by the script VM to return a bool.