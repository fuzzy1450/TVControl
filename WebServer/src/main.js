const { Timer } = require("src/TimeElapsed")
const TvAPI = require("src/ControlAPI")


const express = require('express')

const app = express()
const port = 3000

app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  res.sendFile('./views/index.html', { root: `${__dirname}/../` })
  console.log(`[${req.ip}] Requested Index`)
})

app.get('/favicon.ico', (req, res) => {
	res.sendFile('./resources/favicon.ico', { root: `${__dirname}/../` })
})

app.post('/api/All/:RequestType', (req, res) => {
	let stopwatch = new Timer()
	let ObjClass = "All"
	let ReqType = req.params.RequestType
	
	
	console.log(`[${req.ip}] Requested ${ReqType} for ${ObjClass}//${ObjClass}`)
	
	TvAPI.Control[ObjClass][ReqType](res)
	.then(function(){
		console.debug(`[${req.ip}] Answered ${ReqType} for ${ObjClass}//${ObjClass} (${stopwatch})`)	
	})
	.catch(function(err){
		console.log(err)
		console.log(`[${req.ip}] (${ObjClass}//${ObjClass}) API Request Error [${ReqType}] (${stopwatch})`)
	})
})

app.post('/api/:className/:objName/:RequestType', (req, res) => {
	let stopwatch = new Timer()
	let ObjClass = req.params.className
	let ObjName = req.params.objName
	let ReqType = req.params.RequestType
	
	
	console.log(`[${req.ip}] Requested ${ReqType} for ${ObjClass}//${ObjName}`)
	
	
	TvAPI.Control[ObjClass][ObjName][ReqType](res)
	.then(function(){
		console.debug(`[${req.ip}] Answered ${ReqType} for ${ObjClass}//${ObjName} (${stopwatch})`)	
	})
	.catch(function(err){
		console.log(err)
		console.log(`[${req.ip}] (${ObjClass}//${ObjName}) API Request Error [${ReqType}](${stopwatch})`)
	})
})

app.get('/resources/:resource', (req, res) => {
	let ResourceName = req.params.resource
	console.debug(`[${req.ip}] Requested Resource ${ResourceName}`)
	res.sendFile(ResourceName, { root: `${__dirname}/../resources`})
})



app.listen(port, () => {
  console.log(`Tv Control Webserver listening on port ${port}`)
})
