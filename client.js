const readline = require('readline'),
    io = require('socket.io-client'),
    forge = require('node-forge'),
    bigInt = require("big-integer"),
    crypto = require('crypto');

let ioClient = io.connect('http://localhost:8000');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Простые числа (генерируются сервером)
let p;
let g;

let private_key; // Закрытый ключ
let public_key; // Открытый ключ (генерируется из закрытого ключа)
let random_key; // Случайный ключ
let message_key; // Отправляемое сообщение (генерируется с помощью случайного ключа)

let session_keys = [];

function getSessionKey(user)
{
    // Получение сесионного ключа
    let user_public_key = user.public_key;
    let user_message_key = user.message_key;

    user_public_key = bigInt(user_public_key);
    user_message_key = bigInt(user_message_key);

    let t1 = user_public_key.pow(random_key);
    let t2 = user_message_key.pow(private_key);
    let t3 = t1.multiply(t2);
    return t3.mod(p);
}

function encryptWithKey(text, session_key)
{
    let sha = crypto.createHmac('sha256', 'secret')
        .update(session_key.toString(16))
        .digest();

    let key = forge.pkcs5.pbkdf2(sha, sha, 1, 16);
    let iv = forge.pkcs5.pbkdf2(sha, sha, 1, 16);

    let cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({iv: iv});
    cipher.update(forge.util.createBuffer(text));
    cipher.finish();
    let encrypted = cipher.output;
    // Превращение побитного массива строки в хекс
    return encrypted.toHex();
}

function decryptWithKey(text, session_key)
{
    let sha = crypto.createHmac('sha256', 'secret')
        .update(session_key.toString(16))
        .digest();

    let key = forge.pkcs5.pbkdf2(sha, sha, 1, 16);
    let iv = forge.pkcs5.pbkdf2(sha, sha, 1, 16);

    let decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({iv: iv});

    // Превращение хекса в побитный массив строки
    let buf = Buffer.from(text, 'hex');
    let byte_string = new forge.util.ByteStringBuffer(buf);

    decipher.update(byte_string);

    let result = decipher.finish();

    return decipher.output.data;
}

rl.on('line', function (msg) {
    for (let i = 0; i < session_keys.length; i++) {

        let user = session_keys[i];

        // не отправлять сообщение самому себе
        if (user.socket_id !== ioClient.id) {
            let session_key = getSessionKey(user);

            let encrypted_msg = encryptWithKey(msg, session_key);

            console.log('собщение было зашифровано ключом сессии ' + session_key + ' и отправлено ' + user.socket_id);

            ioClient.emit('send', {
                'to': user.socket_id,
                'message': encrypted_msg,
            });
        }
    }

    rl.prompt(true);
});

ioClient.on('message', function (data) {

    for (let i = 0; i < session_keys.length; i++) {

        let user = session_keys[i];
        let user_socket_id = user.socket_id;

        if (user_socket_id === data.from) {

            let message = data.msg;

            let session_key = getSessionKey(session_keys[i]);

            console_out('было получено сообщение "' + message + '" от ' + data.from);
            console_out('посчитанный сеансовый ключ для него ' + session_key);

            let decrypted_message = decryptWithKey(message, session_key);

            console_out('расшифровка: ' + decrypted_message)
        }
    }
});

ioClient.on('prime_nums', function (data) {

    p = new bigInt(data.p);
    g = new bigInt(data.g);

    // Генерация закрытого ключа
    let a_big = crypto.randomBytes(1).toString('hex');
    private_key = bigInt(a_big, 16);

    console_out('ваш закрытый ключ: ' + private_key);

    // Генерация открытого ключа
    public_key = g.modPow(private_key, p);
    console_out('ваш открытый ключ: ' + public_key);

    // Случайная переменная
    random_key = bigInt.randBetween(2, p.minus(1));
    console_out('ваша случайная переменная: ' + random_key);

    // Сообщение на отправку
    message_key = g.modPow(random_key, p);

    console_out('ваше сообщение на отправку: ' + message_key);

    ioClient.emit('publish_public_data', { pub: public_key, msg_key: message_key });
    console_out('открытый ключ и сообщение было разослано всем пользователям для установления сеансового ключа между вами');
});

ioClient.on('public', function (data) {

    session_keys = data;

    // console_out('public');
    console_out('в комнате ' + session_keys.length + ' человек(а)');
});

function console_out(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
}

