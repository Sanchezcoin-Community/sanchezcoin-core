const script_token_parser = require('../src/parser');
const interpreter = require('../src/interpreter');
const lexer = require('../src/lexer');


// Wird verwendet um ein Script zu Parsen
module.exports.parseScript = async function(script_string) {
    let tokenized_script = await lexer(script_string);
    let parsed_script = await script_token_parser(tokenized_script);
    return parsed_script.hex_script.toLowerCase();
};
