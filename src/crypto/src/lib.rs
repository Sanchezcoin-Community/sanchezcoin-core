use schnorrkel::{signing_context, SecretKey, Keypair, PublicKey, Signature, MiniSecretKey, ExpansionMode};
use neon::prelude::*;


// Erzeugt einen sr25519 Keypair aus einem Seed
fn get_key_pair_from_hash_sr25519(mut cx: FunctionContext) -> JsResult<JsObject> {
    // Die Argumente werden abgerufen
    let seed_js = cx.argument::<JsString>(0)?;

    // Der Seed wird eingelesen
    let decoded_seed = hex::decode(&seed_js.value(&mut cx)).unwrap();

    // Es wird ein SeecretKey aus dem Seed erstellt
    let mini_secret_key:MiniSecretKey = MiniSecretKey::from_bytes(&decoded_seed).unwrap();
    let secret_key:SecretKey = mini_secret_key.expand(ExpansionMode::Uniform);

    // Das Ausgabeobjekt wird erzeugt
    let obj = cx.empty_object();

    // Die Daten werden in Hex umgewandelt und zurückgegeben
    let priv_key_bytes = secret_key.to_bytes();
    let pubkey_bytes = secret_key.to_public().to_bytes();
    let hexed_public_key = cx.string(hex::encode(&pubkey_bytes));
    let hexed_priv_key = cx.string(hex::encode(&priv_key_bytes));

    // Die Werte werden hinzugefügt
    obj.set(&mut cx, "public_key", hexed_public_key)?;
    obj.set(&mut cx, "private_key", hexed_priv_key)?;

    // Das Objekt wird zurückgegeben
    Ok(obj)
}

// Wird verwendet um einen Hexwert zu Signieren
fn sign_digest_sr25519(mut cx: FunctionContext) -> JsResult<JsString> {
    // Die Argumente werden abgerufen und umgewandelt
    let hex_sec_key = cx.argument::<JsString>(0)?;
    let hex_value = cx.argument::<JsString>(1)?;
    let p_sec_key = &hex_sec_key.value(&mut cx);
    let p_value = &hex_value.value(&mut cx);

    // Aus dem Privaten Schlüssel wird ein Schlüsselpaar abgeleitet
    let keypair_bytes_hex = hex::decode(p_sec_key).unwrap();
    let secret_key_again: SecretKey = SecretKey::from_bytes(&keypair_bytes_hex).unwrap();
    let key_pair:Keypair = secret_key_again.to_keypair();

    // Die Daten werden Dekodiert
    let decoded_key_data = hex::decode(p_value).unwrap();

    // Die Daten werden Signiert
    let ctx = signing_context(&decoded_key_data);
    let sig: Signature = key_pair.sign(ctx.bytes(&decoded_key_data));

    // Die Signatur wird umgewandelt
    let finally_sig = sig.to_bytes();
    let finally_sig_hex = hex::encode(finally_sig);

    // Die Signatur wird zurück
    Ok(cx.string(finally_sig_hex))
}

// Wird verwendet um eine Signatur zu überprüfen
fn verfiy_digest_sign_sr25519(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    // Die Argumente werden abgerufen
    let hex_pubkey_key = cx.argument::<JsString>(0)?;
    let hex_plain_data = cx.argument::<JsString>(1)?;
    let hex_sig = cx.argument::<JsString>(2)?;

    // Die Argumente werden umgewandelt
    let readed_hex_pkey = &hex_pubkey_key.value(&mut cx);
    let readed_hex_data = &hex_plain_data.value(&mut cx);
    let readed_hex_sig = &hex_sig.value(&mut cx);

    // Die Daten werden Dekodiert
    let decoded_readed_hex_pkey = hex::decode(readed_hex_pkey).unwrap();
    let decoded_readed_hex_data = hex::decode(readed_hex_data).unwrap();
    let decoded_readed_hex_sig = hex::decode(readed_hex_sig).unwrap();

    // Der Öffentliche Schlüssel wird eingelesen
    let public_key:PublicKey = PublicKey::from_bytes(&decoded_readed_hex_pkey).unwrap();

    // Die Daten werden auf die Signaturprüffung vorbereitet
    let ctx = signing_context(&decoded_readed_hex_data);
    let prepared_data = ctx.bytes(&decoded_readed_hex_data);

    // Die Signatur wird eingelesen
    let readed_signature = Signature::from_bytes(&decoded_readed_hex_sig).unwrap();

    // Es wird geprüft ob die Signatur korrekt ist
    let signature_check_result:bool = public_key.verify(prepared_data, &readed_signature).is_ok();

    // Das Ergebniss wird zurückgegeben
    Ok(cx.boolean(signature_check_result))
}


#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("get_key_pair_from_hash_sr25519", get_key_pair_from_hash_sr25519)?;
    cx.export_function("verfiy_digest_sign_sr25519", verfiy_digest_sign_sr25519)?;
    cx.export_function("sign_digest_sr25519", sign_digest_sr25519)?;
    Ok(())
}
