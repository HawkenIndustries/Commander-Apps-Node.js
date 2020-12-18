/* eslint-env node */

const cp = require('child_process');

var init = async function(){
	try{
		const NODE_ENV = process.env.NODE_ENV || 'production';
		var newrelic;

		// to use newrelic for enhanced debugging and performance monitoring
		// add the newrelic module to your heroku app and uncomment here and in newrelic.js
		// if(NODE_ENV === 'production')
		// 	newrelic = require('newrelic');

		// Modules
		require('dotenv').config();
		const fs = require('fs');
		var logger = require('./logging');
		var express = require('express');
		var compress = require('compression');
		var favicon = require('serve-favicon');
		var moment = require('moment');
		var _ = require('lodash');
		var path = require('path');
		var stylus = require('stylus');
		var serveStatic = require('serve-static');
		var request = require('request-promise-native');
		var nib = require('nib');
		var redis = require('redis');
		var uuid = require('node-uuid');
		var bluebird = require('bluebird');
		bluebird.promisifyAll(redis.RedisClient.prototype);
		bluebird.promisifyAll(redis.Multi.prototype);
		const delay = time => new Promise(res => setTimeout(res, time));

		var session = require('express-session');
		const MemoryStore = require('memorystore')(session);
		var RedisStore = require('connect-redis')(session);
		var flash = require('express-flash');

		// Express
		var app = express();
		app.locals._ = _; // allow lodash in pug/jade templates		
		app.locals.moment = moment;

		// helpers
		// https://stackoverflow.com/questions/4901133/json-and-escaping-characters/4901205#4901205
		app.locals.stringify = function(s, emit_unicode){
			var json = JSON.stringify(s);
				return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
				function(c) {
					return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);
				}
			);
		};

		const host = 'https://app.kmccommander.com';
		const jwt = process.env.COMMANDER_JWT;
		let rqst = async function(method, url, body, jwtt=jwt, ms=''){
			let ts = (new Date()).valueOf();
			let urlt = url;
			if(url.indexOf('?')<0)
				urlt += '?';
			else
				urlt += '&';
			urlt += 'ms='+(ms||'');
			console.log(`querying ${host}${urlt}`);
			let data = await request({
				method: method,
				url: `${host}${urlt}`,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${jwtt}`
				},
				body: JSON.stringify(body)
			});
			ts = (new Date()).valueOf()-ts;
		
			data = JSON.parse(data);
			if(data.errorMessage)
				throw new Error(data.errorMessage);
			if(data.results){
				for(let i in data.results){
					if(data.results[i].licenseKey)
						delete data.results[i].licenseKey;
				}
			}
			return {
				data,
				ts
			};
		}
		let pagerqst = async function(method, url, body, options={}){
			// loop through and get all results
			let times = [];
			let rslts = [];
			let page = '';
			let ms = options.ms||'';
			let maxPage = options.maxPage||-1;
			let jwtt = options.jwt||jwt;
			console.log('body', body);
			console.log('jwt', jwtt);
			while(true){
				try{
					let urlt = url;
					if(url.indexOf('?')<0)
						urlt += '?';
					else
						urlt += '&';
					urlt += 'page='+(page||'');
					console.log(`paging ${method} ${urlt}...`);
					let data = await rqst(method, urlt, body, jwtt);
					console.log(`fetched page ${page}...`);
					page = data.data.nextPage||null;
					let results = data.data.results||[];
					rslts = rslts.concat(results);
					times.push(data.ts);
					maxPage--;
					if(page == null || maxPage==0){
						console.log(`...done paging`);
						break;
					}
				}catch(e){
					console.error(e);
				}
			}
			return {
				data: rslts,
				ts: times
			};
		}
		app.commanderRequest = rqst;
		app.pagedCommanderRequest = pagerqst;

		// Express config
		app.set('port', process.env.PORT||'1337');

		// turn on gzip compression
		app.use(compress());

		// use pug for easy html https://pugjs.org/
		app.set('views', path.join(__dirname, 'views'));
		app.set('view engine', 'pug');

		// use stylus for easy stylesheets https://stylus-lang.com/
		app.use(stylus.middleware({
			src: path.join(__dirname, 'public'),
			compile(str, path){
				return stylus(str)
					.set('filename', path)
					.use(nib())
					.import('nib');
			}
		}));

		// to activate the favicon, place favicon-96x96.png into /public/images
		// app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon-96x96.png')));

		// serve static files with cache turned off
		// this is to help prevent the cache from loading out of date files
		// if you feel confident in your update process and would like to speed up your site,
		// uncomment the next line instead
		// app.use(serveStatic(__dirname + '/public'));
		app.use(serveStatic(path.join(__dirname, 'public'), {
			setHeaders(res, path){
				res.setHeader('Cache-Control', 'no-cache');
			}
		}));
		
		// parse POST json bodys into req.body
		app.use(require('body-parser').json({'limit':'15mb'}));
		app.use(require('body-parser').urlencoded({extended:true}));
		app.use(function (req, res, next) {
			// Website you wish to allow to connect
			res.setHeader('Access-Control-Allow-Origin', req.get('origin')||'*');
			// Request methods you wish to allow
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			// Request headers you wish to allow
			res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
			// Set to true if you need the website to include cookies in the requests sent
			// to the API (e.g. in case you use sessions)
			res.setHeader('Access-Control-Allow-Credentials', true);
			// Pass to next layer of middleware
			next();
		});
		app.use(function(req, res, next){
			if(newrelic)
				res.locals.newrelic = newrelic;
			next();
		});
		app.use(function(req, res, next){
			res.locals.path = req.path;
			next();
		});

		// Information regarding Dynos: https://devcenter.heroku.com/articles/dynos#local-environment-variables
		const dynoNumber = process.env.DYNO ? parseInt(process.env.DYNO.replace(/\D/g, '')) : 0;
		const dynoType = process.env.DYNO ? process.env.DYNO.replace(/[^a-z]/g, '') : null;
		console.warn('dyno number '+ dynoNumber);
		console.warn('dyno type '+ dynoType);

		app.use(logger.middleware);
		
		let client = null;
		if(NODE_ENV=='production'){
			console.log(`Connecting to redis at ${process.env.REDISCLOUD_URL}`);
			client = redis.createClient(process.env.REDISCLOUD_URL, {
				retry_strategy(options) {
					if (options.error && options.error.code === 'ECONNREFUSED') {
						// End reconnecting on a specific error and flush all commands with
						// an individual error
						console.error('Redis: The server refused the connection');
					}
					console.error('retrying redis connection attempt '+options.attempt);
					// reconnect after max 5 seconds
					return Math.min(options.attempt * 100, 5000);
				}
			});
			client.on('ready',()=>{
				console.log(`Connected to redis at ${process.env.REDISCLOUD_URL}`);
			});
			client.on('error',()=>{
				console.error(`Redis Client error at ${process.env.REDISCLOUD_URL}`);
			});
		}

		if(NODE_ENV == 'development')
			app.locals.pretty = true;

		var cookieParser = require('cookie-parser');
		app.use(cookieParser(process.env.COOKIE_SECRET));

		// automatic redirection to https
		if(NODE_ENV=='production'){
			app.use(function(req, res, next){

				// This is how heroku knows to forward http to https.
				if(req.headers["x-forwarded-proto"] === "https"){
					return next();
				}
				res.redirect('https://'+req.hostname+req.url);
			});
		}

		var sessionMiddleware = session({
			cookie: { 
				maxAge: 60000*60*24*30, // 30 days
				// basically for http if you set this true it won't set cookies because that would be insecure to transfer cookies over http.
				// for debugging or local use you can set this to false to allow setting cookies over http.
				secure: (NODE_ENV=='production'
					? true 
					: false
				)
			}, 
			rolling: true,
			secret: process.env.COOKIE_SECRET,
			// if on development, memory store is fine. otherwise use redis
			store: (NODE_ENV=='production'? (new RedisStore({
					client: client
				})) : (new MemoryStore({
					checkPeriod: 86400000 // prune expired entries every 24h
				}))
			),
			resave: false,
			saveUninitialized: false,
			unset: 'destroy'
		});
		app.use(function(req, res, next){
			var tries = 3;

			function lookupSession(error){
				if(error){
					return next(error)
				}

				tries -= 1;

				if(req.session !== undefined){
					return next();
				}

				if(tries < 0) {
					return next(new Error('no session'));
				}

				sessionMiddleware(req, res, lookupSession);
			}

			lookupSession();
		});
		app.redis = client;

		app.use(flash());
		app.use(function(req, res, next){
			res.locals.flashSuccess = req.flash('success');
			res.locals.flashSuccess = res.locals.flashSuccess.pop()||null;
			res.locals.flashError = req.flash('error');
			res.locals.flashError = res.locals.flashError.pop()||null;
			next();
		});

		app.Classes = {};
		var Users = require('./controllers/users');
		Users = await Users(app);
		var Index = require('./controllers/index');
		Index = await Index(app);

		// Displays a 404 if the endpoint isn't not found
		if(NODE_ENV === "development"){
			app.get('*', function(req, res){
				res.status(404);
				return res.send(`Error: 404 Not Found`);
			});
		}else{ // Show users the home page on 404 in production
			app.get('*', function(req, res){
				console.warn('404', req.url);
				res.redirect(301, '/');
			});
		}

		// Error handler
		app.use(function(err, req, res, next){
			console.error(`${req.originalUrl} | ${err.message} | ${err.stack}`);
			if(req.path != '/' && req.path != '/login'){
				if(req.flash)
					req.flash('error', 'Error. Please try again');
				return res.redirect(req.header('Referrer')||'/');
			}else{
				res.status(503);
				if(err.message ==='no session'){
					let redisUrl = new URL('',process.env.REDISCLOUD_URL);
					err.message=`Redis client error. Check Redis Database URL and Port connectivity:${redisUrl.host}`;
				}
				
				if(req.headers && req.headers.accept && req.headers.accept.split(',').some(s=>s==="application/json")){
					return res.status(401).json({error:err.message||err}); // show the error instead of redirecting.
				}
				return res.status(400).render('error', {
					title:'Error',
					message:err.message
				});
			}
		});

		return app;
	}catch(e){
		console.error(e.message, e.stack);
	}
}

module.exports = init;
