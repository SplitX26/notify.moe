'use strict'

let arn = require('../../../lib')

exports.get = function(request, response) {
	let nick = request.params[0]

	if(!nick)
		return response.end()

	arn.getUserByNick(nick, function(error, user) {
		if(error)
			return response.end()

		response.setHeader('Content-Type', 'application/json')

		// Do not show critical information
		delete user.id
		delete user.ip
		delete user.accounts
		delete user.ageRange
		delete user.email
		delete user.gender
		delete user.firstName
		delete user.lastName

		response.end(JSON.stringify(user))
	})
}