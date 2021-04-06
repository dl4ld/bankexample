const cmdArgs = require('command-line-args')
const cmdOptions = [
	{ name: 'config', alias: 'c', type: String},
	{ name: 'debug', type: Boolean}
]


const options = cmdArgs(cmdOptions)
options.config = options.config || "./config"
const config = require(options.config)

const Actor = (options.debug) ?  require('../cllibsecureamqp').Actor : require('secureamqp').Actor

async function main() {
		const guard = new Actor(config)
		const visitor = new Actor(config)
		const wife = new Actor(config)
		const vault = new Actor(config)
		const camera = new Actor(config)

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


		
		guard.createAbility('sign', null, function(req, res) {
			console.log("Guard received signing request: ", req.msg)
			const request = req.msg

			if( request.dst == wife.id() && request.operation == "receiveFlowers" ) {
				console.log("Accepted request")
				const token = guard.sign(request)
				res.send(token, 200)
			}
		})

		camera.monitorInteractions(function(data) {
			//console.log("Camera: ", data)
			const token = data.opAccessToken
			if(!token) {
				return
			}
			const decodedToken = camera.decodeToken(token)
			const verifyToken = camera.verifyToken(token)

			const headerDst = data.dst
			const tokenDst = decodedToken.data.dst



			if(headerDst != tokenDst) {
				console.log("camera: ALERT!")
			}

			const headerFunction = data.function.split('.')[2]
			const tokenFunction = decodedToken.data.operation

			if(headerFunction != tokenFunction) {
				console.log("camera: ALERT2!")
			}
			
		})

		wife.createAbility('receiveFlowers', guard.id(), function(req, res) {
			const who = req.header.src
			const what = JSON.stringify(req.msg)
			console.log(who + " gave me " + what)
			res.send()
		})

		vault.createAbility('open', guard.id(), function(req, res) {
			const who = req.header.src
			console.log(who + " opened the vault.")
			res.send()
		})

		const request = {
			dst: wife.id(),
			operation: "receiveFlowers"
		}

		const token = await visitor.talkToActor(guard.id()).requestSignature(request)

		const reply1 = await visitor.talkToActor(wife.id()).call('receiveFlowers', token, { some: 'red tulips'})
		const reply2 = await visitor.talkToActor(vault.id()).call('open', token, { some: 'red tulips'})
		


		

		/*const planner = new Actor(config)
		await planner.boot()
		const plannerAddress = planner.id()
		const plannerKey = planner.privateKey()
		console.log("Actor address: ", plannerAddress)
		console.log("Actor private key: ", plannerKey)


		// listen to events from other actors and react to them
	    planner.listenToEvent("codeRed", async function(event) {
			console.log("Received event: ", event)
			// request asset manifests from actor
			const manifests = await planner.talkToActor(t.bucketA).requestAllManifests()
			console.log("All manifests: ", manifests)
			// request manifest of one asset
			const manifestMyData = await planner.talkToActor(t.bucketA).requestManifest('myData')
			console.log("myData: ", manifestMyData)
			// request information about abilities
			const abilities = await planner.talkToActor(t.bucketA).requestAllAbilities()
			console.log("All abilities: ", abilities)
			// create an operation definition for the auditor to sign
			//const op  = planner.createOperationRequestDefinition(t.bucketA, 'myData', 'data', {})
			const op = {
				name: "flippy",
				src: "blalala"
			}
			console.log("OPPPPP:", op)
			// ask auditor actor to sign the operation definition for a limited time
			const token = await planner.talkToActor(t.auditorA).requestSignature(op, 1)
			console.log("Received token: ", token)
			// use token from auditor as an authorization call 'send' function on bucketA actor
			//const res = await planner.talkToActor(t.bucketA).requestAsset('myData', token)
			const res = await planner.talkToActor(t.bucketA).interestInAsset('myData', token, function(res) {
				console.log("data update: ", res.msg)
			})
			//const res = await planner.talkToActor(t.bucketA).call('send', token, { some: 'thing'})
			console.log(res)
		})*/

}

main()
