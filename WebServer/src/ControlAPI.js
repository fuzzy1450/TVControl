const util = require("util");
const exec = util.promisify(require("child_process").exec);

const { Timer, TimerUtils } = require("src/TimeElapsed");


const https = require("https");
const ax = require("axios");
const axios = ax.create({ 
	httpsAgent: new https.Agent({
		rejectUnauthorized: false //Important for Vizio TVs
	}) 
});


// this object will be exported by this module
const Control = {
	All: {},
	Bays: {},
	Rooms: {},
	TVs: {}
};


// Base TV class - has no actual functionality
// Has two arguments: the TV IP and the TV name. 
class TV {
	constructor(IP, DeviceName){
		this.IP = IP
		this.DeviceName=DeviceName
	}
	
	PowerOn(){
		throw new Error("PowerOn not implemented for " + this.DeviceName)
	}

	PowerOff(){
		throw new Error("PowerOff not implemented for " + this.DeviceName)
	}
	
	GetStatus(){
		throw new Error("GetStatus not implemented for " + this.DeviceName)
	}
}


// Roku TV class
// the 3rd argument is the id of the plugin you want the tv to launch at startup
class RokuTV extends TV {
	constructor(IP, DeviceName, StartupPluginID){
		super(IP, DeviceName)
		this.StartupPluginID=StartupPluginID
		this.powerState = 0
	}
	
	PowerOn(cb, retries=5){
		let TVOBJ = this
		let stopwatch = new Timer()
		return axios.post('http://'+this.IP+':8060/keypress/PowerOn')
		.then(function (res){
			if(res.status == 200){
				if(TVOBJ.StartupPluginID!=0){
					return TVOBJ.LaunchApp(TVOBJ.StartupPluginID)
					.then(function(res){
						return {name:TVOBJ.DeviceName, powerState:res, time:stopwatch.GetTime()}
					})
					.catch(function(err){
						console.log(":12:")
						console.log(err)
						return {name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()}
					})
				} 
				TVOBJ.powerState = 1
			} else if(res.status == 202){
				return TVOBJ.PowerOn(null, retries)
			} else {
				throw new Error(`Could not connect to ${TVOBJ.DeviceName} - Response Code ${res.status}.`)
			}
		})
		.catch(function(err){
			if (retries>0){
				return TVOBJ.PowerOn(null, retries-1)
			} else {
				console.log(":13:")
				console.log(err)
				throw new Error("Failed to turn on TV "+TVOBJ.DeviceName+" - max retries reached")
			}
		}).finally(function(){
			if(cb && cb.send){
				cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()})
			}
		})
	}
	
	LaunchApp(appID, retries=5){
		let TVOBJ = this
		return axios.post('http://'+this.IP+':8060/launch/'+appID)
		.then(function (res){
			if(res.status == 200 || res.status == 204){
				return 1
			} else {
				throw new Error(`Could not connect to ${TVOBJ.DeviceName} - Response Code ${res.status}.`)
			}
		})
		.catch(function(err){
			if (retries>0){
					return TVOBJ.LaunchApp(appID, retries-1)
				} else {
					console.log(":14:")
					console.log(err)
					throw new Error("Failed to launch app on device "+TVOBJ.DeviceName+" - max retries reached")
				}
		})
	}
	
	PowerOff(cb, retries=5){
		let TVOBJ = this
		let stopwatch = new Timer()
		return axios.post('http://'+this.IP+':8060/keypress/PowerOff')
		.then(function (res){
			if(res.status == 200 || res.status == 202){
				TVOBJ.powerState = 0
				return {name:TVOBJ.DeviceName, powerState:0, time:stopwatch.GetTime()}
			} else {
				throw new Error(`Could not connect to ${TVOBJ.DeviceName} - Response Code ${res.status}.`)
			}
		})
		.catch(function(err){
			if (retries>0){
				return TVOBJ.PowerOff(null, retries-1)
			} else {
				console.log(":15:")
				console.log(err)
				throw new Error("Failed to turn off TV "+TVOBJ.DeviceName+" - max retries reached")
			}
		}).finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()})}
		})
	}

	GetStatus(cb){
		let stopwatch = new Timer()
		let TVOBJ = this
		return axios.get('http://'+this.IP+':8060/query/device-info')
		.then(function (res){
			if(res.status == 200){
				if(res.data.includes("PowerOn")){
					TVOBJ.powerState = 1
				}
			}
			return {name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()}
			
		}).catch(function(err){
				console.log(":1:")
				console.log(err)
				throw new Error("Failed to get status for TV "+TVOBJ.DeviceName+" - max retries reached")
		}).finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()})}
		})
	}
	
}


// Vizio TV class
// the 3rd argument is the AuthKey - please read the README
// the 4th argument is the input name. You can find this by quering the status of the TV
// the 5th argument is the input hash. This will be next to the input name in the above query.
class VizioTV extends TV {
	constructor(IP, DeviceName, AuthKey, inputName, inputHashVal){
		super(IP, DeviceName)
		this.AuthKey=AuthKey
		this.powerState=0
		this.ChangeInputRequestData = {"REQUEST": "MODIFY","VALUE": inputName,"HASHVAL": inputHashVal}
	}
	
	
	PowerOn(cb, retries=10){
		let TVOBJ = this
		let stopwatch = new Timer()
		return this.GetStatus()
		.then(function(res){
			if(!res.powerState){
				return axios.put('https://'+TVOBJ.IP+':7345/key_command/', {"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]},  {headers:{"AUTH":TVOBJ.AuthKey}})
				.then(function (res){
					if(res.status == 200){
						TVOBJ.powerState=1
						return TVOBJ.LaunchApp()
						.then(function(res){
							return {name:TVOBJ.DeviceName, powerState:res, time:stopwatch.GetTime()}
						})
						.catch(function(){
							throw new Error(`Could not change input on ${TVOBJ.DeviceName}`)
						})
					} else {
						throw new Error(`Could not connect to ${TVOBJ.DeviceName} - Response Code ${res.status}.`)
					}
				})
				.catch(function (err){
					console.log(":2:")
					console.log(err)
					throw new Error(`Could not connect to ${TVOBJ.DeviceName}`) 
				})
			}
		})
		.catch(function(err){
			if (retries>0){
				return TVOBJ.PowerOn(null, retries-1)
			} else {
				console.log(":3:")
				console.log(err)
				throw new Error("Failed to turn on TV "+TVOBJ.DeviceName+" - max retries reached")
			}
		})
		.finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()})}
		})
	}
	
	LaunchApp(retries=10){
		let TVOBJ = this
		return axios.put('https://'+this.IP+':7345/menu_native/dynamic/tv_settings/devices/current_input', this.ChangeInputRequestData,  {headers:{"AUTH":this.AuthKey}})
		.then(function (res){
			if(res.status == 200){
				return 1
			} else {
				throw new Error("Failed to change input for TV "+TVOBJ.DeviceName)
			}
		}).catch(function (err){
			if(retries > 0){
				return TVOBJ.LaunchApp(retries-1)
			} else {
				console.log(":4:")
				console.log(err)
				throw new Error("Failed to change input for TV "+TVOBJ.DeviceName+" - max retries reached")
			}
		})
	}
	
	PowerOff(cb, retries=10){
		let TVOBJ = this
		let stopwatch = new Timer()
		return this.GetStatus()
		.then(function(res){
			if(res.powerState){
				return axios.put('https://'+TVOBJ.IP+':7345/key_command/', {"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]},  {headers:{"AUTH":TVOBJ.AuthKey}})
				.then(function (res){
					if(res.status == 200){
						TVOBJ.powerState=0
					} else {
						throw new Error(`Failed to turn off TV ${TVOBJ.DeviceName} - Response Code ${res.status}`)
					}
					return {name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()}
				})
				.catch(function (err){
					console.log(":5:")
					console.log(err)
					throw new Error (`Failed to connect to ${TVOBJ.DeviceName}`)
				})
			}
		})
		.catch(function(err){
			if(retries > 0){
				return TVOBJ.PowerOff(null, retries-1)
			} else {
				console.log(":6:")
				console.log(err)
				throw new Error(`Failed to turn off ${TVOBJ.DeviceName} - max retries reached.`)
			}
		})
		.finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()})}
		})
	}


	GetStatus(cb){
		let TVOBJ = this
		let stopwatch = new Timer()
		return axios.get('https://'+this.IP+':7345/state/device/power_mode', {headers:{"AUTH":this.AuthKey}})
		.then(function (res){
			if(res.status == 200){
				if(res.data.ITEMS[0].VALUE==1){
					TVOBJ.powerState = 1
				} else {
					TVOBJ.powerState = 0
				}
			} else {
				TVOBJ.powerState = 0
			}
			return {name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()}
		})
		.catch(function(err){
			console.log(":7:")
			console.log(err)
			throw new Error(`Could not get status for ${TVOBJ.DeviceName}`)
		})
		.finally(function(){
			if(cb){
				cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState, time:stopwatch.GetTime()})
			}
		})
	}
}


// Android TV class
// 3rd argument is the device's MAC address
// It may be necessary to send a wake-on-lan packet to these Device
// But I have not run into this problem in quite some time
class AndroidTV extends TV {
	constructor(IP, DeviceName, MAC){
		super(IP, DeviceName)
		this.MAC=MAC
		this.connected=false
		let TVOBJ=this
		this.DeviceDisconnect()
		.finally(function(){ // the Android TVs state is remembered by the program
			TVOBJ.GetStatus()// so we must find out what it is.
		})
	}
	
	DeviceDisconnect(){
		let TVOBJ = this 
		return exec(`adb.exe disconnect ${TVOBJ.IP}:5555`)
		.then(function(){
			TVOBJ.connected=false
			return true
		})
		.catch(function(err){
			if(err.stderr.includes("no such device")){
				return true
			} else {
				console.log("Failed to disconnect (?)")
				throw new Error(err)
			}
		})
	}
	
	DeviceConnect(retries=1){
		let TVOBJ = this
		return exec(`adb.exe connect ${TVOBJ.IP}:5555`)
		.then(function(res){
			if(res.stdout.includes("already connected ") || res.stdout.includes("failed")){
				return TVOBJ.DeviceDisconnect()
				.then(function(res){
					if(retries>0){
						return TVOBJ.DeviceConnect(retries-1)
					} else {
						throw new Error("Could not connect to " + TVOBJ.DeviceName + " after retries.\n" + res.stdout)
					}
				})
				.catch(function(err){
					if(retries>0){
						return TVOBJ.DeviceConnect(retries-1)
					} else {
						console.log(":22:")
						console.log(err)
						throw new Error("Could not connect to " + TVOBJ.DeviceName + " after retries.\n" + err.stderr)
					}
				})
			} 
			else {
				TVOBJ.connected=true
				return true
			}
		})
		.catch(function(err){
			if(err.stderr && (err.stderr.includes("device unauthorized") || err.stderr.includes("failed to authenticate"))){
				throw new Error("The server is not authorized to send commands to "+TVOBJ.DeviceName+". Please reconfigure the device.")
			}
			else if(retries > 0 && !err.message.includes("after retries.")){
				return TVOBJ.DeviceConnect(retries-1)
			} else {
				console.log(":8:")
				console.log(err)
				TVOBJ.connected=false
				throw new Error("Failed to connect to TV " + TVOBJ.DeviceName + " after retries.")
			}
		});
	}
	
	GetStatus(cb, retries=10, TVPass){
		let TVOBJ = this
		let stopwatch = new Timer()
		if(TVPass){TVOBJ=TVPass}
		
		if(TVOBJ.connected){
			let pwr = 0
			return exec(`adb.exe -s ${this.IP}:5555 shell dumpsys power`)
			.then(function(res){
				if(res.stdout.includes("Display Power: state=OFF")){
					pwr = 0
				} else {
					pwr = 1
				}
				return {name:TVOBJ.DeviceName, powerState:pwr, time:stopwatch.GetTime()}
			})
			.catch(function(err){
				if(retries>0){
					return TVOBJ.GetStatus(cb, retries-1)
				} else {
					if(err.stderr && err.stderr.includes("adb.exe: device offline")){
						return {name:TVOBJ.DeviceName, powerState:pwr, ERR:true, time:stopwatch.GetTime()}
					} else {
						console.log(":9:")
						console.log(err)
						throw new Error(`Failed to get status for device ${TVOBJ.DeviceName} - max retries reached.`)
					}
				}
			})
			.finally(function(){
				if(cb){cb.send({name:TVOBJ.DeviceName, powerState:pwr, time:stopwatch.GetTime()})}
			})
		} 
		else if(retries>0) {
			console.log(TVOBJ.DeviceName + " is not Connected. Attempting Reconnect")
			return TVOBJ.DeviceConnect()
			.then(function(){
				console.log(TVOBJ.DeviceName +" Reconnected Successfuly")
				return TVOBJ.GetStatus(cb, retries-1)
				.then(function(res){
						return res
					})
					.catch(function(err){
						console.log(":21:")
						console.log(err)
						return {name:TVOBJ.DeviceName, powerState:pwr, ERR:true, time:stopwatch.GetTime()}
					})
			})
			.catch(function(){
				if(retries > 0){
					console.log(`Failed to reconnect to ${TVOBJ.DeviceName}. ${retries} retries remaining.`)
					return TVOBJ.GetStatus(cb, retries-1)
					.then(function(res){
						return res
					})
					.catch(function(err){
						console.log(":21:")
						console.log(err)
						return {name:TVOBJ.DeviceName, powerState:pwr, ERR:true, time:stopwatch.GetTime()}
					})
						
						
				} else {
					throw new Error(`Failed to reconnect to ${TVOBJ.DeviceName} after retries.`)
				}
			})
			
		} else {
			console.log("GetStatus failed on " + TVOBJ.DeviceName + " after retries.")
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:0, ERR:true, time:stopwatch.GetTime()})}
			throw new Error({name:TVOBJ.DeviceName, powerState:0, ERR:true, time:stopwatch.GetTime()})
		}
	}
	
	PowerOn(cb, retries=10){
		let TVOBJ = this
		let stopwatch = new Timer()
		let pwr = 0
		return this.GetStatus()
		.then(function(TVStatus){
			if(!TVStatus.powerState){
				return exec(`adb.exe -s ${TVOBJ.IP}:5555 shell input keyevent 224`)
				.then(function(){
					pwr = 1
					return {name:TVOBJ.DeviceName, powerState:pwr, time:stopwatch.GetTime()}
				})
				.catch(function(){
					throw new Error(`Failed to PowerOn ${TVOBJ.DeviceName}`)
				})
			} else {
				return {name:TVOBJ.DeviceName, powerState:1, time:stopwatch.GetTime()}
			}
		})
		.catch(function(err){
			if(retries>0){
				return TVOBJ.PowerOn(cb, retries-1)
			} else {
				console.log(":10:")
				console.log(err)
				pwr = 0
				throw new Error(`Failed to PowerOn ${TVOBJ.DeviceName} - max retries reached.`)
			}
		})
		.finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:pwr, time:stopwatch.GetTime()})}
		})
	}
	
	PowerOff(cb, retries=10){
		let pwr = 1;
		let TVOBJ = this
		let stopwatch = new Timer()
		return this.GetStatus()
		.then(function(TVStatus){
			if(TVStatus.powerState){
				return exec(`adb.exe -s ${TVOBJ.IP}:5555 shell input keyevent 223`)
				.then(function(){
					pwr = 0
					return {name:TVOBJ.DeviceName, powerState:pwr, time:stopwatch.GetTime()}
				})
				.catch(function(){
					throw new Error(`Failed to PowerOff ${TVOBJ.DeviceName}`)
				})
			} else {
				return {name:TVOBJ.DeviceName, powerState:0, time:stopwatch.GetTime()}
			};
		})
		.catch(function(err){
			if(retries>0){
				return TVOBJ.PowerOff(null, retries-1)
			} else {
				console.log(":11:")
				console.log(err)
				pwr = 0
				throw new Error(`Failed to PowerOff ${TVOBJ.DeviceName} - max retries reached.`)
			}
		})
		.finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:pwr, time:stopwatch.GetTime()})}
		})
		
	}
	
}

// Control Area class - a group of TV objects.
// the 1st is a list of every TV name in the control area
// the 2nd argument is the object loaded from etc/TVs.json. 
class ControlArea {
	constructor(TVNameList, AllTVs){
		this.TVNameList=TVNameList
		this.TVs = []
		for(let i in this.TVNameList){
			this.TVs.push(AllTVs[this.TVNameList[i]])
		}
	}
	
	PowerOn(cb){
		let FNs = []
		for(let i in this.TVs){
			FNs[i]=this.TVs[i].PowerOn()
		}
		return Promise.all(FNs)
		.then(function(values) {
			let timeStats = TimerUtils.Summarize(values.map(function(x){if(x && x.time){return x.time}else{console.log(x)};return -1}))
			console.debug(timeStats.toString())
		
			if(cb){ cb.send(values) }
			return values
			
		}).catch(function(err){
			if(err.code == 'ETIMEDOUT'){
				console.log("Connection to " + err.address + ":" + err.port + " timed out")
			} 
			else if(err.code == 'ECONNRESET'){
				console.log("Connection failed - Socket Hung Up")
			}
			else {
				console.log("1-----------")
				console.log(err)
			}
		})
	}

	PowerOff(cb){
		let FNs = []
		for(let i in this.TVs){
			FNs[i]=this.TVs[i].PowerOff()
		}
		return Promise.all(FNs)
		.then(function(values) {
			let timeStats = TimerUtils.Summarize(values.map(function(x){if(x && x.time){return x.time}else{console.log(x)};return x}))
			console.debug(timeStats.toString())
			if(cb){ cb.send(values) }
			return values
			
		}).catch(function(err){
			if(err.code == 'ETIMEDOUT'){
				console.log("Connection to " + err.address + ":" + err.port + " timed out")
			} 
			else if(err.code == 'ECONNRESET'){
				console.log("Connection failed - Socket Hung Up")
			}
			else {
				console.log("2-----------")
				console.log(err)
			}
		})
	}
	
	GetStatus(cb){
		let FNs = []
		for(let i in this.TVs){
			FNs[i]=this.TVs[i].GetStatus()
		}	
		return Promise.all(FNs)
		.then(function(values) {
			
			let timeStats = TimerUtils.Summarize(values.map(function(x){if(x && x.time){return x.time}else{console.log(x)};return x}))
			console.debug(timeStats.toString())
			if(cb){ cb.send(values) }
			return values
			
		}).catch(function(err){
			if(err.code == 'ETIMEDOUT'){
				throw new Error("Connection to " + err.address + ":" + err.port + " timed out")
			} 
			else if(err.code == 'ECONNRESET'){
				throw new Error("Connection failed - Socket Hung Up")
			}
			else {
				console.log("3-----------")
				throw err
			}
		})
	}
}


// This function will help load TVs from the json. 
function TVLoader(Scheme, Name, IP, Arg1, Arg2, Arg3){
	if(Scheme == "RK"){
		return new RokuTV(IP, Name, Arg1)
	} else if (Scheme == "AND") {
		return new AndroidTV(IP, Name, Arg1)
	} else if (Scheme == "VZ") {
		return new VizioTV(IP, Name, Arg1, Arg2, Arg3)
	} else {
		throw new Error(`Scheme ${Scheme} unrecognized for device ${Name} // ${IP} (${Arg1}, ${Arg2}, ${Arg3})`)
	}
}


const Devices = require("etc/TVs.json");	// An Object containing info on all TVs
const Areas = require("etc/Areas.json");	// An Object which contains info for each Control Area.

// create each TV Object
let TVs = {}
for(let i in Devices.TVs){ 
	TVs[i] = TVLoader(...Devices.TVs[i])
} 

Control.TVs = TVs


// create the Control Areas
Control.All = new ControlArea(Areas.All, TVs)

for(let i in Areas.Bays){ 
	Control.Bays[i] = new ControlArea(Areas.Bays[i], TVs)
} 

for(let i in Areas.Rooms){ 
	Control.Rooms[i] = new ControlArea(Areas.Rooms[i], TVs)
} 

// Export the Control object
exports.Control = Control

