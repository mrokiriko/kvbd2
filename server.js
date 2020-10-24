const io = require('socket.io');
const forge = require('node-forge');

const server = io.listen(8000);

async function getP()
{
    return await new Promise((resolve, reject) => {
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

let session_keys = [];

(async() => {

    console.log('сервер запущен :^)');
    console.log('генерация простых чисел:');

    let p = await getP();
    let g = await getG();

    p = p.toString(10);
    g = g.toString(10);

    console.log('p =', p);
    console.log('g =', g);

    server.on('connection', function (socket) {

        console.log('у нас новенький:', socket.id);

        socket.emit('prime_nums', {
            'p': p,
            'g': g
        });

        socket.on('send', function (data) {

            let item = {
                'from': socket.id,
                'to': data.to,
                'msg': data.message,
            };

            console.log('передача зашифрованного сообщения:');
            console.log(item);

            socket.to(data.to).emit('message', item);

        });

        socket.on('publish_public_data', function (data) {

            console.log(socket.id, 'опубликовал свои публичные данные:');
            console.log('открытый ключ:', data.pub);
            console.log('отправленное сообщение:', data.msg_key);

            let info = {
                'socket_id': socket.id,
                'public_key': data.pub,
                'message_key': data.msg_key,
            };
            session_keys.push(info);

            // Обновить открытую информацию о пользователях в чате
            server.sockets.emit('public', session_keys);
        });

        socket.on('disconnect', (reason) => {
            console.log('пользователь', socket.id, 'вышел');
            let new_session_keys = [];
            for (let i = 0; i < session_keys.length; i++) {
                if (session_keys[i].socket_id !== socket.id) {
                    new_session_keys.push(session_keys[i]);
                }
            }
            session_keys = new_session_keys;

            // Обновить открытую информацию о пользователях в чате
            server.sockets.emit('public', session_keys);
        });

    });
})();