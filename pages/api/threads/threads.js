let shortid = require('shortid')

const minTitleLength = 3
const maxTitleLength = 100
const maxPostLength = 100000

exports.post = function*(request, response) {
	let user = request.user

	if(!user) {
		response.writeHead(409)
		response.end('Not logged in')
		return
	}
	
	let tag = request.body.tag
	
	if(!tag) {
		response.writeHead(409)
		response.end('No tag specified')
		return
	}
	
	let title = request.body.title

	if(!title) {
		response.writeHead(409)
		response.end('Thread title required')
		return
	}
	
	title = title.trim()
	
	if(title.length > maxTitleLength || title.length < minTitleLength) {
		response.writeHead(409)
		response.end('Invalid title length')
		return
	}

	let text = request.body.text

	if(!text) {
		response.writeHead(409)
		response.end('Post text required')
		return
	}
	
	text = text.trim()
	
	if(text.length > maxPostLength) {
		response.writeHead(409)
		response.end('Post too long')
		return
	}
	
	let sticky = request.body.sticky ? 1 : 0
	
	let postId = shortid.generate()
	
	// Save post
	yield arn.set('Threads', postId, {
		id: postId,
		authorId: user.id,
		title,
		text,
		tags: [tag],
		likes: [],
		sticky,
		replies: 0,
		created: (new Date()).toISOString()
	})
	
	response.end(postId)
}