// person.js
'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const venom = require('venom-bot');
const axios = require('axios');


const express = require("express");
const http = require('http').Server(express);
const io = require('socket.io')(http);


var admin = require("firebase-admin");

var serviceAccount = require("/var/www/html/myzap/annie-ai-firebase-adminsdk-gcpur-d22e969699.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://annie-ai.firebaseio.com"
});








module.exports = class Sessions {

    static async start(sessionName, options = []) {
        Sessions.options = Sessions.options || options; //start object
        Sessions.sessions = Sessions.sessions || []; //start array

        var session = Sessions.getSession(sessionName);

        if (session == false) { //create new session
            console.log("session == false");
            session = await Sessions.addSesssion(sessionName);
        } else if (["CLOSED"].includes(session.state)) { //restart session
            console.log("session.state == CLOSED");
            session.state = "STARTING";
            session.status = 'notLogged';
            session.client = Sessions.initSession(sessionName);
            Sessions.setup(sessionName);
        } else if (["CONFLICT", "UNPAIRED", "UNLAUNCHED"].includes(session.state)) {
            console.log("client.useHere()");
            session.client.then(client => {
                client.useHere();
            });
        } else {
            console.log("session.state: " + session.state);
        }
        return session;
    } //start

    static async addSesssion(sessionName) {
        var newSession = {
            name: sessionName,
            qrcode: false,
            client: false,
            status: 'notLogged',
            state: 'STARTING'
        }
        Sessions.sessions.push(newSession);
        console.log("newSession.state: " + newSession.state);

        //setup session
        newSession.client = Sessions.initSession(sessionName);
        Sessions.setup(sessionName);

        return newSession;
    } //addSession

    static async initSession(sessionName) {
        var session = Sessions.getSession(sessionName);
        session.browserSessionToken = null;
        if (Sessions.options.jsonbinio_secret_key !== undefined) {//se informou secret key pra salvar na nuvem
            //busca token da session na nuvem
            var config = {
                method: 'get',
                url: 'https://api.jsonbin.io/b/' + Sessions.options.jsonbinio_bin_id,
                headers: {
                    'secret-key': Sessions.options.jsonbinio_secret_key
                }
            };
            const response = await axios(config);
            if (response.data.WAToken1 !== undefined) {
                session.browserSessionToken = response.data;
                console.log("puxou isso: " + JSON.stringify(session.browserSessionToken));
            } else {
                console.log("nao tinha token na nuvem");
            }
        }//if jsonbinio_secret_key

        const client = await venom.create(
            sessionName,
            (base64Qr) => {
                session.state = "QRCODE";
                session.qrcode = base64Qr;
                console.log("new qrcode updated - session.state: " + session.state);
            },
            (statusFind) => {
                session.status = statusFind;
                console.log("session.status: " + session.status);
            }, {
            headless: true,
            devtools: false,
            useChrome: false,
            debug: false,
            logQR: false,
            browserArgs: [
                '--log-level=3',
                '--no-default-browser-check',
                '--disable-site-isolation-trials',
                '--no-experiments',
                '--ignore-gpu-blacklist',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--enable-features=NetworkService',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                // Extras
                '--disable-webgl',
                '--disable-threaded-animation',
                '--disable-threaded-scrolling',
                '--disable-in-process-stack-traces',
                '--disable-histogram-customizer',
                '--disable-gl-extensions',
                '--disable-composited-antialiasing',
                '--disable-canvas-aa',
                '--disable-3d-apis',
                '--disable-accelerated-2d-canvas',
                '--disable-accelerated-jpeg-decoding',
                '--disable-accelerated-mjpeg-decode',
                '--disable-app-list-dismiss-on-blur',
                '--disable-accelerated-video-decode',
            ],
            refreshQR: 15000,
            autoClose: 60 * 60 * 24 * 365, //never
            disableSpins: true
        },
            session.browserSessionToken
        );
        console.log("usou isso no create: " + JSON.stringify(session.browserSessionToken));
        return client;
    } //initSession





    static async setup(sessionName) {
        var session = Sessions.getSession(sessionName);
        await session.client.then(client => {
            client.onStateChange(state => {
                session.state = state;
                if (state == "CONNECTED") {





                    console.log("tem jsonbinio_secret_key");
                    if (Sessions.options.jsonbinio_secret_key !== undefined && session.browserSessionToken == undefined) {//se informou secret key pra salvar na nuvem
                        setTimeout(async () => {
                            console.log("gravando token na nuvem...");
                            //salva dados do token da sessão na nuvem
                            const browserSessionToken = await client.getSessionTokenBrowser();
                            var data = JSON.stringify(browserSessionToken);
                            var config = {
                                method: 'put',
                                url: 'https://api.jsonbin.io/b/' + Sessions.options.jsonbinio_bin_id,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'secret-key': Sessions.options.jsonbinio_secret_key,
                                    'versioning': 'false'
                                },
                                data: data
                            };
                            await axios(config)
                                .then(function (response) {
                                    console.log(JSON.stringify(response.data));
                                })
                                .catch(function (error) {
                                    console.log(error);
                                });
                        }, 2000);
                    }//if jsonbinio_secret_key
                }//if CONNECTED
                console.log("session.state: " + state);
            }); //.then((client) => Sessions.startProcess(client));
           



            client.onMessage((message) => {



                  /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status=='n') {
                                 
                                  admin.database().ref("usuario/" + numero[0] + "/").update({"nombre": message.body});
                                 admin.database().ref("usuario/" + numero[0] + "/").update({"status": "1"});
                                 

client.sendText(message.from, 'Bienvenid@ '+message.body+'!, espero te encuentres de maravilla\nEstoy feliz de que quieras conocer mucho mas sobre nuestros parques nacionales¿?');

                                    setTimeout(function(){

                                           client.sendText(message.from, 'Muy bien '+response.data.nombre+'!, ¿Tenes pensado realizar algun tipo de actividad en particular?\n\n\n*@fauna*\n_Avistaje de fauna_\n\n*@fotos*\n_Fotografía natural_\n\n*@senderismo*\n_Recorre nuestros hermosos paisajes naturales_\n\n*@bicicleta*\n_Disfruta de los mejores destinos y recorre sus caminos en bicicleta_\n\n*@acampar*\n_Te recomendamos los mejores parques nacionales para que disfrutes de un increible campamento_\n\n');

                                        
                                            
                                            //admin.database().ref("usuario/" + numero[0] + "/").update({"status": "1"});
                                              

                                    },3000);


                            } 
                               
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

                

                if (message.body === '@parques') {



                     

                     /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                               
                             if (response.data!=null) {
                                 
                                  client.sendText(message.from, 'Hola '+response.data.nombre+'!, espero te encuentres de maravilla\nEstoy feliz de que quieras conocer mucho mas sobre nuestros parques nacionales¿?');

                                    setTimeout(function(){

                                           client.sendText(message.from, '¿Tenes pensado realizar algun tipo de actividad en particular?\n\n\n*@fauna*\n_Avistaje de fauna_\n\n*@fotos*\n_Fotografía natural_\n\n*@senderismo*\n_Recorre nuestros hermosos paisajes naturales_\n\n*@bicicleta*\n_Disfruta de los mejores destinos y recorre sus caminos en bicicleta_\n\n*@acanpar*\n_Te recomendamos los mejores parques nacionales para que disfrutes de un increible campamento_\n\n');

                                        
                                            
                                            //admin.database().ref("usuario/" + numero[0] + "/").update({"status": "1"});
                                              

                                    },3000);
                   
                             }else{

                                 client.sendText(message.from, 'Hola!, espero te encuentres de maravilla\nAntes de comenzar dime ¿como es tu nombre?');
                                 admin.database().ref("usuario/" + numero[0] + "/").update({"status": "n"});
                   
                             }
                            
                               
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */
                   

                }







                if (message.body === '@fauna') {


                    client.sendText(message.from, 'Genial! en este caso te recomiendo *Parque Nacional Mburucuyá*\n_Situado en la provincia de Corrientes, las oportunidades de conectar con la naturaleza en este Parque comienzan apenas se atraviesa el portal de ingreso. Rumbo al Centro Operativo, la Ruta Provincial 86 cruza los Pastizales de Santa María, donde suele avistarse el yetapá de collar. Además, en esta zona, el arroyo Portillo convoca a carpinchos, yacarés negros y tortugas de agua._\nhttps://www.youtube.com/watch?v=HtUbffpQOI4');
                   
                           setTimeout(function(){

                             client.sendText(message.from, '*Parque Nacional Sierra de las Quijadas*\n_Las aves no faltan en Sierras de las Quijadas, como las martinetas, el águila mora, el vencejo de collar, cóndores, águila coronada y cardenal amarillo._\nhttps://www.youtube.com/watch?v=doJ4Yu1WFVc');
                           
                           },3000);

                }

                if (message.body === '@fotos') {


                    client.sendText(message.from, 'WOW! que linda experiencia tomar fotografias a nuestros parques.\n\n *Parque Nacional Quebrada del Condorito*\n_Al oeste de la provincia de Córdoba, en el centro de las Sierras Grandes, la naturaleza del Parque Nacional Quebrada del Condorito se convierte en un escenario perfecto para fotografiar cóndores. Desde el Balcón Norte y Balcón Sur, dos puntos de observación unidos por una pasarela que cruza el río Condorito, se pueden observar estas enormes aves que dan el nombre al área protegida._\nhttps://www.youtube.com/watch?v=msVJltfPHkk');
                   
                           setTimeout(function(){

                             client.sendText(message.from, '*Parque Nacional Los Glaciares*\n_Ubicado al sudoeste de Santa Cruz, entre gigantes hielos continentales, una magnitud de glaciares –como el mítico Perito Moreno– contornean el paisaje que completan lagunas y ríos de deshielo, lagos, y cerros imponentes como el Torre. Aquí los amantes de la fotografía encuentran el lugar ideal para desplegar sus pasiones artísticas y capturar las mejores postales del área protegida más grande de la Argentina, declarada Sitio de Patrimonio Mundial por la UNESCO en 1981._\nhttps://www.youtube.com/watch?v=LlWuv_QarxY');
                           
                           },3000);

                }

                 if (message.body === '@senderismo') {


                    client.sendText(message.from, 'Gran desafio!.\n\n *Parque Nacional Lago Puelo*\n_Entre volcanes, ventisqueros y lagos, se encuentra la selva valdiviana de esta área protegida ubicada en la provincia del Chubut. En el Área Recreativa, que ocupa la cabecera norte del lago Puelo, se puede disfrutar de una de las pocas playas arenosas de la región. También abordar las catorce estaciones del sendero de interpretación Bosque de las sombras, un recorrido de 400 metros autoguiado y de baja dificultad._\nhttps://www.youtube.com/watch?v=Cfit9B4SqpY');
                   
                           setTimeout(function(){

                             client.sendText(message.from, '*Parque Nacional Lanín*\n_Esta área protegida ubicada en la provincia de Neuquén, que conserva más de 400.000 hectáreas de Bosques Patagónicos, Estepa y Altos Andes, ofrece a los viajeros más de 80 sendas para disfrutar._\nhttps://www.youtube.com/watch?v=C1Em_FR15TE');
                           
                           },3000);

                }


                 if (message.body === '@bicicleta') {


                    client.sendText(message.from, 'Vamos a pedalear juntos!, te recomiendo estos parques.\n\n *Parque Nacional El Palmar*\n_En esta área protegida del Litoral, situada en la provincia de Entre Ríos, los senderos son custodiados por cientos de palmeras de yatay. En bicicleta se puede visitar el arroyo de Los Loros, donde se bañan carpinchos y lobitos de río, y un mirador que permite apreciar el contraste entre el paisaje natural y los campos aledaños._\nhttps://www.youtube.com/watch?v=JQpAl03CVb8');
                   
                           setTimeout(function(){

                             client.sendText(message.from, '*Parque Nacional Los Arrayanes*\n_Al sur de la provincia de Neuquén, un sendero de 12 kilómetros une Villa La Angostura con el Bosque de Arrayanes, a lo largo de la Península de Quetrihué: un camino para maravillarse ante la belleza de nuestra Patagonia y observar vistas magníficas del lago Nahuel Huapi._\nhttps://www.youtube.com/watch?v=JcfYMGQBX4Y');
                           
                           },3000);

                }


                if (message.body === '@acampar') {


                    client.sendText(message.from, 'Genial!, existen grandes lugares para acampar.\n\n *Parque Nacional Nahuel Huapi*\n_Ubicado en las provincias de Neuquén y Río Negro, el primer Parque Nacional de la Argentina convive con ciudades y villas turísticas. Sin embargo, muchos viajeros del país y del mundo prefieren acampar para vivir, aún más, el contacto con la naturaleza._\nhttps://www.youtube.com/watch?v=O0-zm7Us-fA');
                   
                           setTimeout(function(){

                             client.sendText(message.from, '*Parque Nacional Perito Moreno*\n_Este Parque, emplazado en la provincia de Santa Cruz, protege el cerro San Lorenzo, la segunda cima más alta de la Patagonia conocida como “el Everest argentino”. En el mirador que lleva su nombre, se puede acampar o pasar la noche en un nuevo refugio con capacidad para albergar hasta seis personas. La senda para llegar hasta este punto tiene una duración aproximada de 4 horas de caminata._\nhttps://www.youtube.com/watch?v=OuLcptYaPio');
                           
                           },3000);

                }

              
                


            });



        });
    } //setup

    static async closeSession(sessionName) {
        var session = Sessions.getSession(sessionName);
        if (session) { //só adiciona se não existir
            if (session.state != "CLOSED") {
                if (session.client)
                    await session.client.then(async client => {
                        try {
                            await client.close();
                        } catch (error) {
                            console.log("client.close(): " + error.message);
                        }
                        session.state = "CLOSED";
                        session.client = false;
                        console.log("client.close - session.state: " + session.state);
                    });
                return { result: "success", message: "CLOSED" };
            } else { //close
                return { result: "success", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //close

    static getSession(sessionName) {
        var foundSession = false;
        if (Sessions.sessions)
            Sessions.sessions.forEach(session => {
                if (sessionName == session.name) {
                    foundSession = session;
                }
            });
        return foundSession;
    } //getSession

    static getSessions() {
        if (Sessions.sessions) {
            return Sessions.sessions;
        } else {
            return [];
        }
    } //getSessions

    static async getQrcode(sessionName) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            //if (["UNPAIRED", "UNPAIRED_IDLE"].includes(session.state)) {
            if (["UNPAIRED_IDLE"].includes(session.state)) {
                //restart session
                await Sessions.closeSession(sessionName);
                Sessions.start(sessionName);
                return { result: "error", message: session.state };
            } else if (["CLOSED"].includes(session.state)) {
                Sessions.start(sessionName);
                return { result: "error", message: session.state };
            } else { //CONNECTED
                if (session.status != 'isLogged') {
                    return { result: "success", message: session.state, qrcode: session.qrcode };
                } else {
                    return { result: "success", message: session.state };
                }
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //getQrcode

    static async sendText(sessionName, number, text) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendText = await session.client.then(async client => {
                    return await client.sendText(number + '@c.us', text);
                });
                return { result: "success" }
            } else {
                return { result: "error", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //message

    static async sendFile(sessionName, number, base64Data, fileName, caption) {
        var session = Sessions.getSession(sessionName);
        if (session) {
            if (session.state == "CONNECTED") {
                var resultSendFile = await session.client.then(async (client) => {
                    var folderName = fs.mkdtempSync(path.join(os.tmpdir(), session.name + '-'));
                    var filePath = path.join(folderName, fileName);
                    fs.writeFileSync(filePath, base64Data, 'base64');
                    console.log(filePath);
                    return await client.sendFile(number + '@c.us', filePath, fileName, caption);
                }); //client.then(
                return { result: "success" };
            } else {
                return { result: "error", message: session.state };
            }
        } else {
            return { result: "error", message: "NOTFOUND" };
        }
    } //message





}


