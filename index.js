const cmdArgs = require('command-line-args')
const cmdOptions = [
	{ name: 'config', alias: 'c', type: String},
	{ name: 'debug', type: Boolean}
]


const options = cmdArgs(cmdOptions)
options.config = options.config || "./cfg.local"
const config = require(options.config)

const Actor = (options.debug) ?  require('../cllibsecureamqp').Actor : require('secureamqp').Actor

async function main() {

		// create actors
		const guard = new Actor(config)
		const visitor = new Actor(config)
		const wife = new Actor(config)
		const vault = new Actor(config)
		const camera = new Actor(config)

		// initialize actors
		await guard.boot()
		await visitor.boot()
		await wife.boot()
		await vault.boot()
		await camera.boot()
		
		console.log("Started actor guard with address: ", guard.id())
		console.log("Started actor wife with address: ", wife.id())
		console.log("Started actor visitor with address: ", visitor.id())
		console.log("Started actor vault with address: ", vault.id())
		console.log("Started actor camera with address: ", camera.id())
		
		// create a signing ability on the guard actor
		guard.createAbility('sign', null, function(req, res) {
			console.log("Guard received signing request: ", req.msg)
			const request = req.msg

			// check some policy. In this example to give flowers to wife.
			if( request.dst == wife.id() && request.operation == "receiveFlowers" ) {
				console.log("Accepted request")
				// create and sign a token
				const token = guard.sign(request)
				res.send(token, 200)
			}
		})

		// setup surveillance. check all actor interactions that they have
		// have a signed token that allows them to interact. 
		camera.monitorInteractions(function(data) {
			const token = data.opAccessToken
			if(!token) {
				return
			}
			const decodedToken = camera.decodeToken(token)
			const verifyToken = camera.verifyToken(token)

			const headerDst = data.dst
			const tokenDst = decodedToken.data.dst
			const headerFunction = data.function.split('.')[2]
			const tokenFunction = decodedToken.data.operation

			if( headerFunction != tokenFunction  || headerDst != tokenDst ) {
				console.log("camera: ALERT!")
				camera.broadcast("alert", "string", "ALERT!")
			}
			
		})


		// setup wife actor with an ability to receive flowers.
		wife.createAbility('receiveFlowers', guard.id(), function(req, res) {
			const who = req.header.src
			const what = JSON.stringify(req.msg)
			console.log(who + " gave me " + what)
			res.send()
		})

		// setup the bank vault actor with the ability to be opened. 
		vault.createAbility('open', guard.id(), function(req, res) {
			const who = req.header.src
			console.log(who + " opened the vault.")
			res.send()
		})

		// create a document to be signed by guard.
		const request = {
			src: visitor.id(),
			dst: wife.id(),
			operation: "receiveFlowers"
		}

		// workflow step 1: visitor asks guard for token
		const token = await visitor.talkToActor(guard.id()).requestSignature(request)
		// workflow step 2: visitor enters bank and gives flowers to wife.
		const reply1 = await visitor.talkToActor(wife.id()).call('receiveFlowers', token, { some: 'red tulips'})
		// workflow step 3: visitor tries to open bank vault.
		const reply2 = await visitor.talkToActor(vault.id()).call('open', token, { some: 'red tulips'})
}

main()

