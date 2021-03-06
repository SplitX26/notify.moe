import * as arn from 'arn'
import * as HTTP from 'http-status-codes'

let highestId = 1000000

arn.db.forEach('Anime', anime => {
	if(anime.id > highestId)
		highestId = anime.id
})

exports.post = function*(request, response) {
	let user = request.user
	let anime = request.body

	if(!user || (user.role !== 'editor' && user.role !== 'admin')) {
		response.writeHead(HTTP.BAD_REQUEST)
		response.end('Not authorized')
		return
	}

	if(!anime.title || !anime.title.romaji || !anime.title.japanese || !anime.title.english) {
		response.writeHead(HTTP.BAD_REQUEST)
		response.end('Missing title')
		return
	}

	if(!anime.image) {
		response.writeHead(HTTP.BAD_REQUEST)
		response.end('Missing image')
		return
	}

	if(anime.links.filter(link => !link.url || !link.title).length > 0) {
		response.writeHead(HTTP.BAD_REQUEST)
		response.end('Missing link information')
		return
	}

	if(anime.studios && anime.studios.length >= 0 && anime.studios.filter(studio => !studio.id || !studio.name).length > 0) {
		response.writeHead(HTTP.BAD_REQUEST)
		response.end('Missing studio information')
		return
	}

	if(!anime.id) {
		highestId += 1
		anime.id = highestId
		anime.created = (new Date()).toISOString()
		anime.createdBy = user.id
	} else {
		anime.edited = (new Date()).toISOString()
		anime.editedBy = user.id
	}

	arn.db.set('Anime', anime.id, anime).then(() => arn.updateAnimePage(anime)).then(() => response.json(anime))
}