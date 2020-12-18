const init = async function(){
    try{
        var NODE_ENV = process.env.NODE_ENV || 'production';
        const http = require('http');
        var app = await require('./app.js')();
        if(!app){
            throw Error('Failed to initialize app.js');
        }
        var server = http.createServer(app);
        server.listen(app.get('port')); ///
        server.timeout = 180000;
        console.log(`Express listening on port ${app.get('port')} in ${NODE_ENV}`);
    }catch(e){
        console.error(e);
        throw e;
    }
}

module.exports = init;