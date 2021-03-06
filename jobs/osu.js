let RateLimiter = require('limiter').RateLimiter
let osuAPILimiter = new RateLimiter(1, 200)

let updateOsuDetails = function() {
	console.log(chalk.cyan('↻'), 'Updating osu ranks...')

	arn.db.forEach('Users', user => {
		if(!user.osu)
			return

		let apiURL = `https://osu.ppy.sh/api/get_user?k=${arn.api.osu.secret}&u=${user.osu}`

		osuAPILimiter.removeTokens(1, () => {
			fetch({
				uri: apiURL,
				method: 'GET',
				headers: {
					'User-Agent': 'Anime Release Notifier',
					'Accept': 'application/json'
				}
			}).then(body => {
				let osu = JSON.parse(body)[0]

				if(!osu)
					throw new Error(`User ${user.osu} not found on osu`)

				arn.db.set('Users', user.id, {
					osuDetails: {
						nick: osu.username,
						pp: parseFloat(osu.pp_raw),
						level: parseFloat(osu.level),
						accuracy: parseFloat(osu.accuracy),
						playCount: parseInt(osu.playcount)
					}
				})
			}).catch(error => {
				if(error.message.indexOf('not found on osu') === -1)
					console.error(chalk.red(error.stack))
			})
		})
	})
}

arn.repeatedly(30 * minutes, () => {
	updateOsuDetails()
})