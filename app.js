const forge = require('node-forge');
const bigInt = require("big-integer");
const crypto = require('crypto');

async function getP()
{
    return await new Promise((resolve, reject) => {
        // return forge.prime.generateProbablePrime(1024, function (err, num) {
        return forge.prime.generateProbablePrime(16, function (err, num) {
            if (err) {
                reject(err)
            } else {
                // resolve(num.toString(16))
                resolve(num)
            }
        });
    })
}

async function getG()
{
    return await new Promise((resolve, reject) => {
        // return forge.prime.generateProbablePrime(160, function (err, num) {
        return forge.prime.generateProbablePrime(8, function (err, num) {
            if (err) {
                reject(err)
            } else {
                // resolve(num.toString(16))
                resolve(num)
            }
        });
    })
}

async function getR(max)
{
    return await new Promise((resolve, reject) => {
        crypto.randomInt(max, (err, n) => {

            if (err) {
                reject(err)
            } else {
                resolve(n)
            }

        });
    })
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}


// Проверка вычислений
(async() => {

    // Дано системой
    // let p = await getP(); // большое простое число (1024 бит)
    // let g = await getG(); // простое число (160 бит)
    let p_big = await getP(); // большое простое число (1024 бит)
    let g_big = await getG(); // простое число (160 бит)


    p_big =  bigInt(p_big.toString(16), 16);
    g_big =  bigInt(g_big.toString(16), 16);
    // p_big =  bigInt(61);
    // g_big =  bigInt(31);

    console.log('p_big', p_big);
    console.log('g_big', g_big);


    // Алиса и Боб генерируют свои открытые и закрытые ключи
    // let a = crypto.randomBytes(1024);
    // let a_bytes = forge.random.getBytesSync(2);
    // let a = forge.util.bytesToHex(a_bytes); // Закрытый ключ Алисы
    // let b_bytes = forge.random.getBytesSync(2);
    // let b = forge.util.bytesToHex(b_bytes); // Закрытый ключ Боба
    // console.log('a', a);
    // console.log('b', b);

    // let a_big = new bigInt(a, 16);
    // let b_big = new bigInt(b, 16);
    let a_big = crypto.randomBytes(1).toString('hex');
    a_big = bigInt(a_big, 16);
    let b_big = crypto.randomBytes(1).toString('hex');
    b_big = bigInt(b_big, 16);
    // let b_big = new bigInt(b, 16);

    // a_big =  bigInt(77);
    // b_big =  bigInt(208);
    console.log('a_big', a_big);
    console.log('b_big', b_big);

    let A = g_big.modPow(a_big, p_big); // Открытый ключ Алисы
    let B = g_big.modPow(b_big, p_big); // Открытый ключ Боба
    console.log('A', A);
    console.log('B', B);

    // Выбрали Алиса и Боб
    let Ra = bigInt.randBetween(2, p_big.minus(1));
    let Rb = bigInt.randBetween(2, p_big.minus(1));

    // Ra =  bigInt(46);
    // Rb =  bigInt(29);
    console.log('Ra', Ra);
    console.log('Rb', Rb);



    // Создалии сообщения M
    let Ma = g_big.modPow(Ra, p_big);
    console.log('Ma', Ma);
    let Mb = g_big.modPow(Rb, p_big);
    console.log('Mb', Mb);

    // Вычислили сеансовые ключи
    let t = (a_big * Rb) + (b_big * Ra);
    let K = g_big.modPow(t, p_big);
    console.log('K', K);

    let t1 = B.pow(Ra);
    let t2 = Mb.pow(a_big);
    let t3 = t1.multiply(t2);
    let Ka = t3.mod(p_big);
    console.log('Ka', Ka);

    let r1 = A.pow(Rb);
    let r2 = Ma.pow(b_big);
    let r3 = r1.multiply(r2);
    let Kb = r3.mod(p_big);
    console.log('Kb', Kb);

    let sha = crypto.createHmac('sha256', 'secret')
        .update(K.toString(16))
        .digest();

    let key = forge.pkcs5.pbkdf2(sha, sha, 1, 16);
    let iv = forge.pkcs5.pbkdf2(sha, sha, 1, 16);

    let text = 'tenet';

    console.log('ciphering:', text);

    // Провели вычисления

    let cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({iv: iv});
    cipher.update(forge.util.createBuffer(text));
    cipher.finish();
    let encrypted = cipher.output;
// outputs encrypted hex

    let hex = encrypted.toHex();

    console.log(encrypted);
    console.log('encrypted:', hex);

// decrypt some bytes using CBC mode
// (other modes include: CFB, OFB, CTR, and GCM)
    let decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({iv: iv});
    // decipher.update(encrypted);
    // decipher.update(Buffer.from(hex, 'hex'));
    // decipher.update(hex);

    let mm = Buffer.from(hex, 'hex');
    let mmm = new forge.util.ByteStringBuffer(mm);
    // let mmm = new Buffer.from(hex, 'hex');

    console.log(mmm);

    decipher.update(mmm);

    // decipher.update(forge.util.createBuffer(hex));
    let result = decipher.finish(); // check 'result' for true/false
// outputs decrypted hex
    console.log('decipher:', decipher.output.data);

})();