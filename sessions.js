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

const store = require("store2");

var admin = require("firebase-admin");


var serviceAccount = require(__dirname+"/annie-ai-firebase-adminsdk-gcpur-d22e969699.json");

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


                    
var tiempo = new Date();




                  /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status=='n') {
                                 
                                  admin.database().ref("usuario/" + numero[0] + "/").update({"nombre": message.body});
                                  admin.database().ref("usuario/" + numero[0] + "/").update({"status": "1"});
                                  client.sendText(message.from, 'Bienvenid@ '+message.body +'!\n\nQue vas a querer comer?\n\n*@hamburguesas*\n*@bebidas*\n*@empanadas*\n\n\n *@previa:* Mustra cuanto vas gastando\n *@cuenta:* Cierra tu cuenta y genera cÓdigo\n');
                                  store(message.from+'-usuario', {usuario: message.body});            
                            }



                            if (response.data.status=='x') {

                                     axios
                                        .get('https://apprrhh-707b9.firebaseio.com/personal/'+message.body+'.json?print=pretty')
                                        .then(response => {



                                            
                                             if (response.data!=null) {
                                                      admin.database().ref("usuario/" + numero[0] + "/").update({
                                                        "nombre": response.data.leg_nombre+' '+response.data.leg_apellido,
                                                        "dni":message.body
                                                    });
                                                     
                                                      client.sendText(message.from, 'Bienvenid@ '+response.data.leg_nombre+' '+response.data.leg_apellido +'!\n\nEstas verificado en Food Service America\n\nRecorda que para dar aviso que ya estas en tu puesto de prabajo,al llegar a la operación enviame un mensaje que diga *@presente* \n De esta manera queda registrada tu asistenacia y colaboras en la distribución del personal');
                                                        
                                                      setTimeout(function(){
                                            
                                                        client.sendText(message.from, 'Ingresa a tu link personalizado de acceso\nhttps://genesis.foodservice.com.ar/secure?t=ENKJSE_EEWEEF$fsddpps7878555122254&t='+tiempo.getTime()+'&d='+message.body);
                                                    
                                                      },3000);

                                             }else{
                                                    client.sendText(message.from, 'Lamentablemente no tenemos tu DNI en nuestros registros, por favor comunicate con nuestro departamento de Recursos Humanos y comentales tu inquietud\nMuchas gracias');
                                                    admin.database().ref("usuario/" + numero[0] + "/").remove();
                                            }

                                                 

                                    });                 
                            

                            }





                            if (response.data.status=='3') {
                                 
                                  store(message.from+'-cantidad', {cantidad: message.body});
                                  var total = store(message.from+'-precio').precio;
                                  store(message.from+'-total', {total: total*message.body});

                                  client.sendText(message.from, 'Genial! continua si quieres o cierra tu pedido escribiendo @cuenta');

                                  admin.database().ref("usuario/" + numero[0] + "/").update({"status": "1"});
                                              
                            }





                               
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

                


  if (message.body === '@presente') {


  /* consulta en firebase */

         var numero = message.from.split("@");
         axios
            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
            .then(response => {
               
               
             if (response.data!=null) {


                 
                  client.sendText(message.from, 'Hola '+response.data.nombre+'!, espero te encuentres de maravilla\n¿Ya estas en tu puesto de trabajo?');

                    setTimeout(function(){

                        var tiempo = new Date();
                        
                         client.sendText(message.from, 'Ingresa a tu link personalizado de acceso\nhttps://genesis.foodservice.com.ar/secure?t=ENKJSE_EEWEEF$fsddpps7878555122254&t='+tiempo.getTime()+'&d='+response.data.dni);
                    },3000);
   
             }else{

                 client.sendText(message.from, 'Hola!, espero te encuentres de maravilla\nAntes de comenzar dime DNI para validar que eres un empleado de Food Service');
                 admin.database().ref("usuario/" + numero[0] + "/").update({"status": "x"});
   
             }
            
               
            })
            .catch(error => {

               console.log(error);
              

            });

/* cierra consulta en firebase */


  }





 if (message.body === '@retiro') {

    admin.database().ref("pedido/" + numero[0] + "/").push({
        "nombre":store(message.from+'-usuario').usuario,
        "producto": store(message.from+'-producto').producto,
        "cantidad": store(message.from+'-cantidad').cantidad,
        "total":store(message.from+'-total').total,
    });

     client.sendText(message.from, 'Tu cuenta es de $'+store(message.from+'-total').total+'\n');
     client.sendText(message.from, 'Tu tienda mas cercana esta en Av. Juan Bautista Alberdi 7450, Buenos Aires\n\nhttps://goo.gl/maps/KfSAy88E4R4saNwh9');
     client.sendText(message.from, 'Tu código de retiro es https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=7678&chld=L|1&choe=UTF-8\nMuchas gracias!');
     
     store.remove(message.from+'-producto')
     store.remove(message.from+'-cantidad')
     store.remove(message.from+'-total')


 }


  if (message.body === '@cuenta') {

 


    var numero = message.from.split("@");
         axios
            .get('http://localhost/generarpago/?item='+store(message.from+'-producto').producto+'&cantidad='+store(message.from+'-cantidad').cantidad+'&total='+store(message.from+'-precio').precio)
            .then(response => {
               
               
            

                 
                  client.sendText(message.from, 'Tu cuenta es de $'+store(message.from+'-total').total+'\n\nEstamos generando tu link de pago');

                    setTimeout(function(){

                       
                        
                         client.sendText(message.from,response.data.url );
                    
                                 store.remove(message.from+'-producto')
                                 store.remove(message.from+'-cantidad')
                                 store.remove(message.from+'-total')
                                 store.remove(message.from+'-precio')

                    },3000);
   
            
            
               
            })
            .catch(error => {

               console.log(error);
              

            });

     
    



 }

 



                if (message.body === '@tiendademo') {



                     

                     /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                               
                             if (response.data!=null) {


                                 
                                  client.sendText(message.from, 'Hola '+response.data.nombre+'!, espero te encuentres de maravilla\n¿Qué vas a querer comer hoy?');

                                    setTimeout(function(){
                                        client.sendText(message.from, '¿Qué vas a pedir?\n*@hamburguesas*\n*@bebidas*\n*@empanadas*\n\n\n *@previa:* Mustra cuanto vas gastando\n *@cuenta:* Cierra tu cuenta y genera cÓdigo\n');
                                            
                                            admin.database().ref("usuario/" + numero[0] + "/").update({"status": "1"});
                                              

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



                if (message.body === '@hamburguesas') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==1) {
                                 
                                  client.sendText(message.from, 'Muy bien '+response.data.nombre+'!, Tenemos estas hamburguesas para vos\n\n*@hamb1*\n\n*Hamburguesa meat*\n_Doble carne 120 g y doble cheddar._\n*$400*\n\n\n*@hamb2*\n\n*Hamburguesa con bacon*\n_Carne 120 g, cheddar y bacon._\n*$500*\n\n\n');
                                
                                     admin.database().ref("usuario/" + numero[0] + "/").update({"status": "2"});

                                     
                            }

                              
                            

                            
                            
                               
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

                }




                  if (message.body === '@empanadas') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==1) {
                                 
                                  client.sendText(message.from, 'Genial '+response.data.nombre+'!, Tenemos tremendas empanadas para vos\n\n*@emp1*\n\n*Carne picante*\n_Terrible empanada picante._\n*$50*\n\n\n*@emp2*\n\n*Jamon y queso*\n_Increible empanada de JYQ._\n*$40*\n\n\n');
                                
                                     admin.database().ref("usuario/" + numero[0] + "/").update({"status": "2"});
                            }

                          

                            
                            
                               
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

                }


                   if (message.body === '@bebidas') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==1) {
                                 
                                  client.sendText(message.from, 'Los mejores refrescos para vos\n\n*@beb1*\n\n*Coca Cola 1lt*\n_La gaseosa de siempre._\n*$150*\n\n\n*@@beb2*\n\n*Sprite 1lt*\n_Refrescante por todos lados._\n*$140*\n\n\n');
                                
                                     admin.database().ref("usuario/" + numero[0] + "/").update({"status": "2"});
                            }

                           




                            
                            
                               
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

                }

   

if (message.body === '@hamb1') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==2) {
                                 
                                  client.sendText(message.from, '*Hamburguesa meat*\n_Doble carne 120 g y doble cheddar._\n*$400*');

                                  store(message.from+'-producto', {producto: 'Hamburguesa meat'});
                                  store(message.from+'-precio', {precio: 400});
                                 


                                  setTimeout(function(){

                                        client.sendText(message.from, 'decime con un numero cuantas quieres?');
                                        admin.database().ref("usuario/" + numero[0] + "/").update({"status": "3"});

                                  },2000)  
                                
                                    
                            }
  
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

}



if (message.body === '@hamb2') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==2) {
                                 
                                  client.sendText(message.from, '@hamb2*\n\n*Hamburguesa con bacon*\n_Carne 120 g, cheddar y bacon._\n*$500*');

                                  setTimeout(function(){

                                        client.sendText(message.from, 'decime con un numero cuantas quieres?');
                                        admin.database().ref("usuario/" + numero[0] + "/").update({"status": "3"});

                                  },2000)  
                                
                                    
                            }
  
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

}





if (message.body === '@emp1') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==2) {
                                 
                                  client.sendText(message.from, '*Carne picante*\n_Terrible empanada picante._\n*$50*');

                                  setTimeout(function(){

                                        client.sendText(message.from, 'decime con un numero cuantas quieres?');
                                        admin.database().ref("usuario/" + numero[0] + "/").update({"status": "3"});

                                  },2000)  
                                
                                    
                            }
  
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

}



if (message.body === '@emp2') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==2) {
                                 
                                  client.sendText(message.from, '*Jamon y queso*\n_Terrible empanada de QYQ._\n*$40*');

                                  setTimeout(function(){

                                        client.sendText(message.from, 'decime con un numero cuantas quieres?');
                                        admin.database().ref("usuario/" + numero[0] + "/").update({"status": "3"});

                                  },2000)  
                                
                                    
                            }
  
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

}



if (message.body === '@beb1') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==2) {
                                 
                                  client.sendText(message.from, '*Coca Cola 1lt*\n_Gran opcion._\n*$150*');

                                  setTimeout(function(){

                                        client.sendText(message.from, 'decime con un numero cuantas quieres?');
                                        admin.database().ref("usuario/" + numero[0] + "/").update({"status": "3"});

                                  },2000)  
                                
                                    
                            }
  
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

}



if (message.body === '@beb2') {



                    /* consulta en firebase */
                         var numero = message.from.split("@");
                         axios
                            .get('https://annie-ai.firebaseio.com/usuario/'+numero[0]+'.json?print=pretty')
                            .then(response => {
                               
                                
                             if (response.data.status==2) {
                                 
                                  client.sendText(message.from, '*Sprite 1lt*\n_Gran opcion._\n*$140*');

                                  setTimeout(function(){

                                        client.sendText(message.from, 'decime con un numero cuantas quieres?');
                                        admin.database().ref("usuario/" + numero[0] + "/").update({"status": "3"});

                                  },2000)  
                                
                                    
                            }
  
                            })
                            .catch(error => {

                               console.log(error);
                              

                            });

                            /* cierra consulta en firebase */

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


