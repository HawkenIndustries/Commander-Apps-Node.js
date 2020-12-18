'use strict';

var util = require('util'),
    winston = require('winston'),
    logger = new winston.Logger({
        exitOnError: function(err){
            if(err.code=='ECONNRESET') return false;
            return true;
        }
    }),
    production = (!process.env.NODE_ENV || process.env.NODE_ENV == 'production'),
    pname = 'commander';

require('winston-papertrail').Papertrail;

module.exports = {
    middleware: function(req, res, next){
        var time = Date.now();
        time = time.valueOf();
        req.requestStartTime = time;
        res.on('close', function() {
            console.info(req.method+' closed', req.url, res.statusCode);
            // if(res.statusCode < 400) 
                // console.info(req.method+' closed', req.url, res.statusCode);
            // if(res.statusCode >= 400)
                // console.error(req.method+' closed', req.url, res.statusCode);
            // try{throw new Error();}catch(e){console.error(e.stack);}
        });
        res.on('finish', function() {
            var t = Date.now();
            t = t.valueOf();
            t = t-time;
            t = t+'ms';
            if(res.statusCode < 400) 
                console.info(req.method, req.url, res.statusCode, t);
            if(res.statusCode >= 400) 
                console.log(req.method, req.url, res.statusCode, t);    
        });

        next();
    },
    production: production
};

// Override the built-in console methods with winston hooks
switch((process.env.NODE_ENV || '').toLowerCase()){
    case 'test':
        // Don't set up the logger overrides
        break;
    case 'development':
        // if you'd like to track your logs in the cloud, sign up for a Papertrail account and uncomment the following lines
        // logger.add(winston.transports.Papertrail, {
        //     host: '<your host>',
        //     port: <your port>,
        //     colorize: true,
        //     level: 'error',
        //     program: pname,
        //     handleExceptions: true,
        //     handleRejections: true
        // });
        logger.add(winston.transports.Console, {
            colorize: true,
            timestamp: true,
            level: process.env.DEBUG?'debug':'info',
            program: pname,
            handleExceptions: true,
            handleRejections: true
        });
        break;
    case 'noupdates':
        logger.add(winston.transports.Console, {
            colorize: true,
            timestamp: true,
            level: process.env.DEBUG?'debug':'info',
            program: pname,
            handleExceptions: true,
            handleRejections: true
        });
        break;
    default:
        production = true;
        // if you'd like to track your logs in the cloud, sign up for a Papertrail account and uncomment the following lines
        // logger.add(winston.transports.Papertrail, {
        //     host: '<your host>',
        //     port: <your port>,
        //     colorize: true,
        //     level: 'warn',
        //     program: pname
        // });
        logger.add(winston.transports.Console, {
            colorize: true,
            timestamp: true,
            level: process.env.DEBUG?'debug':'info',
            program: pname
        });
        break;
}

function formatArgs(args){
    return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}

console.log = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.info = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.warn = function(){
    var arr = Array.prototype.slice.call(arguments);
    var str = '';
    for(var i in arr){
        if(arr[i] instanceof Error && arr[i].stack){
            var s = arr[i].stack;
            s = s.split('\n');
            if(s.length > 4)
                s = s.splice(0, 4);
            str += s.join('\n');
        }else if(typeof arr[i] === 'object'){
            str += JSON.stringify(arr[i]);
        }else{
            str += arr[i];
        }
        str += '\n';
    }
    logger.warn.apply(logger, [str]);
};
console.error = function(){
    var arr = Array.prototype.slice.call(arguments);
    var str = '';
    for(var i in arr){
        if(arr[i] instanceof Error && arr[i].stack){
            var s = arr[i].stack;
            s = s.split('\n');
            if(s.length > 4){
                let ss = s;
                s = s.splice(0, 4);
            }
            str += s.join('\n');
        }else if(typeof arr[i] === 'object'){
            str += JSON.stringify(arr[i]);
        }else{
            str += arr[i];
        }
        str += '\n';
    }
    logger.error.apply(logger, [str]);
};
console.debug = function(){
    logger.debug.apply(logger, formatArgs(arguments));
};
console.silly = function(){
    logger.silly.apply(logger, formatArgs(arguments));
};