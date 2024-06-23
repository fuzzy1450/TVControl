TvAPI = require("./ControlAPI.js")


const express = require('express')

const app = express()
const port = 3000
let requestCounter=0

app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  res.sendFile('./views/index.html', { root: __dirname })
  console.log("["+req.ip+"] Requested Index")
})

app.post('/api/All/:RequestType', (req, res) => {
	rqID = requestCounter++ 
	console.time("Req#"+String(rqID))
	
	ObjClass = "All"
	ReqType = req.params.RequestType
	console.log("["+req.ip+"] Requested " + ReqType + " for " + ObjClass + "//" + ObjClass)
	TvAPI.Control[ObjClass][ReqType](res)
	
	
	console.debug("Answered Request for "+ ObjClass + "//" + ObjClass)	
	console.timeEnd("Req#"+String(rqID))	
})

app.post('/api/:className/:objName/:RequestType', (req, res) => {
	rqID = requestCounter++
	console.time("Req#"+String(rqID))
	
	ObjClass = req.params.className
	ObjName = req.params.objName
	ReqType = req.params.RequestType
	console.log("["+req.ip+"] Requested " + ReqType + " for " + ObjClass + "//" + ObjName)
	
	
	TvAPI.Control[ObjClass][ObjName][ReqType](res)
	
	
	console.debug("Answered Request for "+ ObjClass + "//" + ObjName)
	console.timeEnd("Req#"+String(rqID))	
})

app.get('/resources/:resource', (req, res) => {
	ResourceName = req.params.resource
	console.debug("["+req.ip+"] Requested Resource " + ResourceName)
	res.sendFile(ResourceName, { root: __dirname+"/resources" })
})



app.listen(port, () => {
  console.log(`Tv Control Webserver listening on port ${port}`)
})
