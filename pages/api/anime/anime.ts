import * as arn from 'arn'
import * as natural from 'natural'

let editListProviderId = async function(request, user, animeId) {
	let bucket = 'Match' + request.body.key
	let providerId = request.body.value.trim()
	let oldProviderId = request.body.old

	if(providerId === oldProviderId) {
		throw new Error('Can not change to same ID!')
	}

	if(bucket !== 'MatchAnimePlanet') {
		providerId = parseInt(providerId)
		oldProviderId = parseInt(oldProviderId)
	}

	let anime = await arn.db.get('Anime', animeId)

	if((!providerId || providerId === NaN) && (oldProviderId && oldProviderId !== NaN)) {
		console.log(`${user.nick} deleted ${request.body.key} ID of '${anime.title.romaji}' (https://notify.moe/anime/${anime.id}): ${oldProviderId} => DELETED`)
		return await arn.db.remove(bucket, oldProviderId)
	}

	let removeOldAndSave = match => {
		let verb = 'edited'
		if(!oldProviderId || oldProviderId === NaN)
			verb = 'added'
		console.log(`${user.nick} ${verb} ${request.body.key} ID of '${anime.title.romaji}' (https://notify.moe/anime/${anime.id}):`, verb === 'added' ? providerId : `${oldProviderId} => ${providerId}`)

		if(oldProviderId !== NaN)
			return arn.db.remove(bucket, oldProviderId).catch(error => null).then(() => arn.db.set(bucket, providerId, match))
		else
			return arn.db.set(bucket, providerId, match)
	}

	try {
		let match = await arn.db.get(bucket, providerId)

		match.id = anime.id
		match.title = anime.title.romaji
		match.similarity = natural.JaroWinklerDistance(match.providerTitle, match.title)
		match.edited = (new Date()).toISOString()
		match.editedBy = user.id

		await removeOldAndSave(match)
	} catch(error) {
		if(error && error.message === 'AEROSPIKE_ERR_RECORD_NOT_FOUND') {
			return await removeOldAndSave({
				id: anime.id,
				title: anime.title.romaji,
				similarity: null,
				providerId,
				providerTitle: '',
				edited: (new Date()).toISOString(),
				editedBy: user.id
			})
		} else {
			console.error(error)
		}
	}
}

exports.get = function(request, response) {
	let id = parseInt(request.params[0])

	if(!id)
		return response.end()

	arn.db.get('Anime', id).then(anime => {
		if(!request.user || request.user.role !== 'admin') {
			delete anime.createdBy
			delete anime.editedBy
		}

		response.json(anime)
	}).catch(error => {
		response.json({
			error
		})
	})
}

exports.post = (request, response) => {
	if(!arn.auth(request, response, 'editor'))
		return

	let user = request.user
	let animeId = parseInt(request.params[0])

	if(!animeId) {
		response.end('Invalid ID!')
		return
	}

	let provider = request.body.key

	if(provider === 'Nyaa') {
		let old = request.body.old
		let title = request.body.value

		if(title) {
			console.log(`${user.nick} set Nyaa title of https://notify.moe/anime/${animeId} from '${old}' to '${title}'`)

			arn.db.set('AnimeToNyaa', animeId, {
				id: animeId,
				title,
				edited: (new Date()).toISOString(),
				editedBy: user.id
			})
			.then(() => arn.animeProviders.Nyaa.getAnimeInfo(animeId))
			.then(() => arn.updateAnimePage(animeId))
			.then(() => response.end())
		} else {
			console.log(`${user.nick} deleted Nyaa title of https://notify.moe/anime/${animeId} which was '${old}'`)

			arn.db.remove('AnimeToNyaa', animeId).then(() => {
				return arn.updateAnimePage(animeId)
			}).then(() => response.end())
		}
	} else {
		editListProviderId(request, user, animeId).then(() => {
			return arn.updateAnimePage(animeId)
		}).catch((error) => {
			if(error && error.message === 'AEROSPIKE_ERR_RECORD_NOT_FOUND') {
				console.error('Anime not found: ' + animeId)
			} else {
				console.error(error)
			}
		}).then(() => {
			response.end()
		})
	}
}