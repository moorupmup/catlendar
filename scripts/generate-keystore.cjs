const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

console.log('🐾 Generating static Android Release Keystore (PKCS#12)...');

// Generate 2048-bit RSA keypair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create X.509 certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(15));
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 30); // 30 years

const attrs = [
  { name: 'commonName', value: 'Catlendar App' },
  { name: 'organizationName', value: 'Catlendar' },
  { name: 'organizationalUnitName', value: 'Mobile' },
  { name: 'countryName', value: 'RU' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign the certificate with SHA-256
cert.sign(keys.privateKey, forge.md.sha256.create());

// Export as PKCS#12 keystore
const alias = 'catlendar';
const password = 'catlendar_release_key_2026';

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey,
  [cert],
  password,
  {
    friendlyName: alias,
    generateLocalKeyId: true,
    algorithm: '3des'
  }
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const targetPath = path.resolve(__dirname, '../android/app/release.keystore');

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, Buffer.from(p12Der, 'binary'));

console.log(`✅ Keystore successfully created at: ${targetPath}`);
console.log(`🔑 Alias: ${alias}`);
console.log(`🔒 Password: ${password}`);
