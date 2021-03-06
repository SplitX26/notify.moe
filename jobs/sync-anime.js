const maxPage = 5

let importAnimeFromAniList = coroutine(function*() {
	console.log(chalk.cyan('↻'), 'Import anime from anilist...')

	// Get an access token
	yield arn.listProviders.AniList.authorize()

	// Check the latest X pages for new anime edits
	for(let page = 1; page <= maxPage; page++) {
		yield Promise.delay(1200)

		// Get the list of 40 anime
		let animeList = yield arn.listProviders.AniList.getAnimeFromPage(page)

		for(let anime of animeList) {
			if(!anime.id)
				continue

			let oldAnime = yield arn.db.get('Anime', anime.id).catch(error => null)

			// Compare edit dates
			if(!oldAnime || oldAnime.anilistEdited !== anime.anilistEdited) {
				console.log(chalk.cyan('↻'), `Updating anime details: '${anime.title.romaji}'`)
				let details = yield arn.listProviders.AniList.getAnimeDetails(anime.id)

				// Write additional info to DB
				yield arn.db.set('Anime', anime.id, Object.assign(anime, details))
			} else {
				yield arn.db.set('Anime', anime.id, anime)
			}
		}

		console.log(chalk.green('✔'), `Finished checking anilist page ${chalk.yellow(page)} (${animeList.length} anime)`)
	}

	// Update the anime list used for the background jobs process
	arn.animeList = yield arn.db.all('Anime')

	console.log(chalk.green('✔'), `Finished syncing anime data with AniList`)
})

arn.repeatedly(1 * hours, importAnimeFromAniList)