/* eslint-disable require-jsdoc */
/* eslint-disable no-unreachable */
/* eslint-disable no-unused-vars */
const delay = time => new Promise(res => setTimeout(res, time));
var path = require('path');
var _ = require('lodash');
var request = require('request-promise-native');
var moment = require('moment');
const fs = require('fs');

var Controller = async function(app){

	var index = async function(req, res){
		try{
			var title = 'KMC Commander';
			var description = title;
			_.extend(res.locals, {
				title,
				description
			});
			return res.render('index');
		}catch(e){
			console.error(e);
			return res.redirect('/login');
		}
	};

	const fetchDevices = async function(req, res){
		try{
			let devices = await app.pagedCommanderRequest('GET', '/api/objects?q=device');
			devices = _.get(devices, 'data', []);
			return res.status(200).json({results: devices, successMessage: 'Fetched devices'});
		}catch(e){
			console.error(e);
			return res.status(400).json({errorMessage: 'Could not fetch devices'});
		}
	}
	const fetchPoints = async function(req, res){
		try{
			// fetches one page of trended points. there can be quite a few...
			let points = await app.pagedCommanderRequest('GET', '/api/objects?q=his', undefined, {
				maxPage: 1
			});
			points = _.get(points, 'data', []);
			return res.status(200).json({results: points, successMessage: 'Fetched devices'});
		}catch(e){
			console.error(e);
			return res.status(400).json({errorMessage: 'Could not fetch devices'});
		}
	}

	app.get('/', app.authenticate, index);
	app.get('/api/devices', app.authenticateAPI, fetchDevices);
	app.get('/api/points', app.authenticateAPI, fetchPoints);
	
	return {
	};
};
module.exports = Controller;
