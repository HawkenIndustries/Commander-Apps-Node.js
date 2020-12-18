const delay = time => new Promise(res => setTimeout(res, time));
var path = require('path');
var _ = require('lodash');

var Controller = async function(app){

	// setup passport

	// you need to use a real user database in production
	// but this will get you started
	const users = [{
		'id': 'sd8907',
		'firstName': 'John',
		'lastName': 'Doe',
		'email': process.env.USER_EMAIL,
		'password': process.env.USER_PASSWORD
	}];

	let fetchUserByEmail = async function(email, password){
		for(let u of users){
			if(u.email == email && u.password == password)
				return u;
		}
		return null;
	}
	let fetchUserById = async function(id){
		for(let u of users){
			if(u.id == id)
				return u;
		}
		return null;
	}

	var passport = require('passport'),
		LocalStrategy = require('passport-local').Strategy;
	app.use(passport.initialize());
	app.use(passport.session());
	passport.use(new LocalStrategy({
		usernameField: 'email'
	}, async function(email, password, done) {
			// lookup the user profile from the database, check the password, and return it
			// for now we're just using the users array above
			let user = await fetchUserByEmail(email, password);
			if(!user)
				return done(null, false, {message: 'The username or password was incorrect'});
			return done(null, user);
		}
	));
	passport.serializeUser(function(user, done) {
		return done(null, user.id);
	});
	passport.deserializeUser(async function(id, done) {
		// normally you would lookup the user from the database using the id and return it
		let user = await fetchUserById(id);
		if(!user)
		return done(null, false, {message: 'This user does not exist'});
		return done(null, user);
	});

	app.use(function(req, res, next){
		if(req.user){
			res.locals.user = req.user;
			var firstName = req.user.firstName;
			var lastName = req.user.lastName;
			var initials = '';
			if(firstName){
				initials += firstName.trim()[0].toUpperCase();
			}
			if(lastName){
				initials += lastName.trim()[0].toUpperCase();
			}
			res.locals.initials = initials;
		}
		next();
	});
	app.authenticate = function(req, res, next){
		// ensure the user is logged in
		if(!req.user){
			req.flash('error', 'You must login to access that');
			return res.redirect('/login');
		}else{
			next();
		}
	}
	app.authenticateAPI = async function(req, res, next){
		// ensure the user is logged in
		if(!req.user){
			return res.status(401).json({errorMessage: 'You must login to access that'});
		}else{
			return next();
		}
	}

	// endpoints

	var login = async function(req, res){
		var title = 'KMC Commander';
		var description = title;
		_.extend(res.locals, {
			title: title,
			description: description
		});
		res.render('login');
	};

	var logout = async function(req, res){
		if(req.user){
			req.session.destroy(function(err){
				res.clearCookie('connect.sid');
				res.clearCookie('licensekey');
				res.redirect('/');
			});
			// req.session = null;
		}else
			res.redirect('/');
	};

	var getMe = async function(req, res){
		console.log(req.user);
		return res.status(200).json({user: req.user});
	}

	app.post('/login', passport.authenticate('local', {
		failureRedirect: '/login',
		failureFlash: true }), function(req, res){
		req.session.save(()=> {
			res.redirect('/');
		});
	});
	app.post('/api/login', function(req, res, next){
		passport.authenticate('local', function(err, user, info){
			if(err){
				return next(err);
			}else if(!user){
				return res.status(401).json({errorMessage: (info&&info.message)||'Error logging in. Please try again'});
			}else{
				req.login(user, function(loginErr){
					// req.user = assigned
					if(loginErr){
						return next(loginErr);
					}
					return res.status(200).json(user);
				});
			}
		})(req, res, next);
	});

	app.get('/login', login);
	app.get('/logout', logout);
	app.post('/logout', logout);
	app.get('/api/me', app.authenticateAPI, getMe);
};

module.exports = Controller;
