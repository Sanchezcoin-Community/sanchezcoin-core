use sha2::{Sha256, Digest};
use hex_literal::hex;


fn compute_swifty_h(inner_value: &[u8]) -> &[u8] {
    // create a Sha256 object
    let mut hasher = Sha256::new();

    // write input message
    hasher.update(inner_value);

    // read hash digest and consume hasher
    let result = hasher.finalize();

    return result.as_slice();
}

fn main() {
    let _revval = compute_swifty_h("hello welt".to_string().as_bytes());
    //println!("{}",val);
}
