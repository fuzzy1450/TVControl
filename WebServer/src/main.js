TvAPI = require("src/ControlAPI")


const express = require('express')

const app = express()
const port = 3000
let requestCounter=0

app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  res.sendFile('./views/index.html', { root: __dirname+"/../" })
  console.log("["+req.ip+"] Requested Index")
})

app.get('/favicon.ico', (req, res) => {
	res.sendFile('./resources/favicon.ico', { root: __dirname+"/../" })
})

app.post('/api/All/:RequestType', (req, res) => {
	let rqID = requestCounter++ 
	console.time("Req#"+String(rqID))
	let ObjClass = "All"
	let ReqType = req.params.RequestType
	
	
	console.log("["+req.ip+"] Requested " + ReqType + " for " + ObjClass + "//" + ObjClass)
	
	TvAPI.Control[ObjClass][ReqType](res)
	.then(function(value){
		console.debug("["+req.ip+"] Answered Request for "+ ObjClass + "//" + ObjClass)	
	})
	.catch(function(err){
		console.log("["+req.ip+"] ("+ ObjClass + "//" + ObjClass+") API Request Error")
	})
	.finally(function(){
		console.timeEnd("Req#"+String(rqID))	
	})
})

app.post('/api/:className/:objName/:RequestType', (req, res) => {
	let rqID = requestCounter++
	console.time("Req#"+String(rqID))
	let ObjClass = req.params.className
	let ObjName = req.params.objName
	let ReqType = req.params.RequestType
	
	
	console.log("["+req.ip+"] Requested " + ReqType + " for " + ObjClass + "//" + ObjName)
	
	
	TvAPI.Control[ObjClass][ObjName][ReqType](res)
	.then(function(value){
		console.debug("["+req.ip+"] Answered Request for "+ ObjClass + "//" + ObjClass)	
	})
	.catch(function(err){
		console.log("["+req.ip+"] ("+ ObjClass + "//" + ObjClass+") API Request Error")
	})
	.finally(function(){
		console.timeEnd("Req#"+String(rqID))	
	})
})

app.get('/resources/:resource', (req, res) => {
	ResourceName = req.params.resource
	console.debug("["+req.ip+"] Requested Resource " + ResourceName)
	res.sendFile(ResourceName, { root: __dirname+"/../resources" })
})



app.listen(port, () => {
  console.log(`Tv Control Webserver listening on port ${port}`)
})
