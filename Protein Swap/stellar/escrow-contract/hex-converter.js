// Convert "hello" to hex
const text = "hello";
const hex = Buffer.from(text, 'utf8').toString('hex');
console.log(`Text: "${text}"`);
console.log(`Hex: ${hex}`); 