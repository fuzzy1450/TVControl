const { spawnSync } = require('child_process');
const util = require("util");
const exec = util.promisify(require("child_process").exec);


const https = require('https')
const ax = require('axios');
const axios = ax.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});


const Control = {
	All: {},
	Bays: {},
	Rooms: {},
	TVs: {}
}


class ControlArea {
	constructor(TVNameList, AllTVs){
		this.TVNameList=TVNameList
		this.TVs = []
		for(i in this.TVNameList){
			this.TVs.push(AllTVs[this.TVNameList[i]])
		}
	}
	
	PowerOn(cb){
		let result = {}
		for(i in this.TVs){
			let DeviceName = this.TVs[i].DeviceName
			
			this.TVs[i].PowerOn()
			.then(function(res) {
				if(cb){	cb.write({name:DeviceName, powerState:res}) }
			})
		}
	}

	PowerOff(cb){
		let result = {}
		for(i in this.TVs){
			let DeviceName = this.TVs[i].DeviceName
			result[i]={name:DeviceName, powerState:this.TVs[i].PowerOff()}
		}
		if(cb){ cb.send(result) }
		return result
	}
	
	GetStatus(cb){
		let FNs = []
		for(i in this.TVs){
			let DeviceName = this.TVs[i].DeviceName
			FNs[i]=this.TVs[i].GetStatus()
		}	
		Promise.all(FNs)
		.then(function(values) {
			if(cb){ cb.send(values) }
		}).catch(function(errs){
			console.log(errs)
		})
	}
}


class TV {
	constructor(IP, DeviceName){
		this.IP = IP
		this.DeviceName=DeviceName
	}
	
	PowerOn(){
		console.log("PowerOn not implemented for " + this.DeviceName)
	}

	PowerOff(){
		console.log("PowerOff not implemented for " + this.DeviceName)
	}
	
	GetStatus(){
		console.log("GetStatus not implemented for " + this.DeviceName)
	}
}

class RokuTV extends TV {
	constructor(IP, DeviceName, StartupPluginID){
		super(IP, DeviceName)
		this.StartupPluginID=StartupPluginID
	}
	
	PowerOn(cb, retries=5){
		let TVOBJ = this
		axios.post('http://'+this.IP+':8060/keypress/PowerOn')
		.then(function (res){
			if(res.status == 200){
				if(TVOBJ.StartupPluginID!=0){
					TVOBJ.LaunchApp(TVOBJ.StartupPluginID)
				} 
				if(cb){cb.send({name:TVOBJ.DeviceName, powerState:1})}
			
			} else {
				if(retries > 0){
					return PowerOn(cb, retries-1)
				} else {
					throw new Error("Failed to turn on TV "+TVOBJ.DeviceName+" - max retries reached")
				}
			}
		}).catch(function(err){
				console.log(err)
				if(cb){cb.send({name:TVOBJ.DeviceName, powerState:0})}
		})
		
		
		
	}
	
	LaunchApp(appID, retries=5){
		axios.post('http://'+this.IP+':8060/launch/'+StartupPluginID)
		.then(function (res){
			if(res.status == 200){
				return 1
			} else {
				if (retries>0){
					return LaunchApp(cb, appID, retries-1)
				} else {
					throw new Error("Failed to launch app on device "+this.DeviceName+" - max retries reached")
				}
			}
		}).catch(function(err){
			console.log(err)
		})
	}
	
	PowerOff(cb, retries=5){
		axios.post('http://'+this.IP+':8060/keypress/PowerOff')
		.then(function (res){
			if(res.status == 200){
				return;
			} else {
				if (retries>0){
					return PowerOff(cb, retries-1)
				} else {
					throw new Error("Failed to turn off TV "+this.DeviceName+" - max retries reached")
				}
			}
		}).catch(function(err){
				console.log(err)
				return;
		}).finally(function(res){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:0})}
		})
	}

	GetStatus(cb){
		let pwr = 0
		let TVOBJ = this
		return axios.get('http://'+this.IP+':8060/query/device-info')
		.then(function (res){
			if(res.status == 200){
				if(res.data.includes("PowerOn")){
					pwr = 1
				}
			}
			return {name:TVOBJ.DeviceName, powerState:pwr}
			
		}).catch(function(err){
				console.log(err)
		}).finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:pwr})}
		})
	}
	
}

class VizioTV extends TV {
	constructor(IP, DeviceName, AuthKey, inputName, inputHashVal){
		super(IP, DeviceName)
		this.AuthKey=AuthKey
		this.powerState=0
		this.ChangeInputRequestData = {"REQUEST": "MODIFY","VALUE": inputName,"HASHVAL": inputHashVal}
	}
	
	
	PowerOn(cb, retries=5){
		
		let TVOBJ = this
		return this.GetStatus()
		.then(function(res){
			if(!res){
				axios.put('https://'+TVOBJ.IP+':7345/key_command/', {"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]},  {headers:{"AUTH":TVOBJ.AuthKey}})
				.then(function (res){
					if(res.status == 200){
						TVOBJ.powerState=1
						cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
					} else {
						if(retries > 0){
							PowerOn(cb, retries-1)
						} else {
							throw new Error("Failed to turn on TV "+TVOBJ.DeviceName+" - max retries reached")
						}
					}
				}).catch(function (err){
					console.log(err)
					cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
				})
			} else {
				cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
			}
		})
		.finally(function(){
				TVOBJ.LaunchApp()
		})
	}
	
	LaunchApp(retries=5){
		let TVOBJ = this
		axios.put('https://'+this.IP+':7345/menu_native/dynamic/tv_settings/devices/current_input', this.ChangeInputRequestData,  {headers:{"AUTH":this.AuthKey}})
		.then(function (res){
			if(res.status == 200){
				return 1
			} else {
				if(retries > 0){
					LaunchApp(retries-1)
				} else {
					throw new Error("Failed to change input for TV "+TVOBJ.DeviceName+" - max retries reached")
				}
			}
		}).catch(function (err){
			console.log(err)
		})
	}
	
	PowerOff(cb, retries=5){
		let TVOBJ = this
		this.GetStatus()
		.then(function(res){
			if(res){
				axios.put('https://'+TVOBJ.IP+':7345/key_command/', {"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]},  {headers:{"AUTH":TVOBJ.AuthKey}})
				.then(function (res){
					if(res.status == 200){
						TVOBJ.powerState=0
						cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
					} else {
						if(retries > 0){
							PowerOff(cb, retries-1)
						} else {
							throw new Error("Failed to turn off TV "+TVOBJ.DeviceName+" - max retries reached")
						}
					}
				}).catch(function (err){
					console.log(err)
					cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
				})
			} else {
				cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
			}
		})
	}


	GetStatus(cb){
		let TVOBJ = this
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
			return {name:TVOBJ.DeviceName, powerState:TVOBJ.powerState}
		}).catch(function(err){
			console.log(err)
		}).finally(function(res){
			if(cb){
				cb.send({name:TVOBJ.DeviceName, powerState:TVOBJ.powerState})
			}
		})
	}
}

class AndroidTV extends TV {
	constructor(IP, DeviceName, MAC){
		super(IP, DeviceName)
		this.MAC=MAC
		this.connected=false
		this.DeviceConnect()
	}
	
	DeviceConnect(retries=5){
		exec(`adb.exe connect ${this.IP}:5555`, (error, stdout, stderr) => {
			if(error) {
				if(retries>0){
					this.DeviceConnect(retries-1)
				}
			} else {
				this.connected=true
			}
		});
	}
	
	GetStatus(cb, retries=5){	
		let TVOBJ = this
		let pwr = 0
		return exec(`adb.exe -s ${this.IP}:5555 shell dumpsys power`)
		.then(function(res){
			if(res.stdout.includes("Display Power: state=OFF")){
				pwr = 0
			} else {
				pwr = 1
			}
			return {name:TVOBJ.DeviceName, powerState:pwr}
		}).catch(function(err){
			if(retries>0){
				return TVOBJ.GetStatus(cb, retries-1)
			} else {
				console.log(err)
			}
		}).finally(function(){
			if(cb){cb.send({name:TVOBJ.DeviceName, powerState:pwr})}
		})
		
	}
	
	PowerOn(cb, retries=5){
		this.GetStatus()
		.then(function(pwr){
			if(!pwr.powerState){
				exec(`adb.exe -s ${this.IP}:5555 shell input keyevent 224`, (error, stdout, stderr) => {
					if(error) {
						if(retries>0){
							this.PowerOn(cb, retries-1)
						} else {
							console.log(error)
							console.log("-------")
							console.log(stderr)
							return 0
						}
					} else {
						cb.send({name:TVOBJ.DeviceName, powerState:1})
						return 1
					}
				});
			}
		})
	}
	
	PowerOff(cb, retries=5){
		let pwr = this.GetStatus()
		if(!pwr){
			exec(`adb.exe -s ${this.IP}:5555 shell input keyevent 26`, (error, stdout, stderr) => {
				if(error) {
					if(retries>0){
						this.PowerOff(cb, retries-1)
					} else {
						console.log(error)
						console.log("-------")
						console.log(stderr)
					}
				} else {
					cb.send({name:TVOBJ.DeviceName, powerState:0})
					return 0
				}
			});
		}
	}
	
}







/*
TVs: {
		TODO: "implement individual TV control",
		FrontDesk4: new TV(...FilePaths.TVs.FrontDesk4),
		FrontDesk3: new TV(...FilePaths.TVs.FrontDesk3),
		FrontDesk2: new TV(...FilePaths.TVs.FrontDesk2),
		FrontDesk1: new TV(...FilePaths.TVs.FrontDesk1),
		PingPongNorth: new TV(...FilePaths.TVs.PingPongNorth),
		PingPongMiddle: new TV(...FilePaths.TVs.PingPongMiddle),
		PingPongSouth: new TV(...FilePaths.TVs.PingPongSouth),
		BowlingMiddle4: new TV(...FilePaths.TVs.BowlingMiddle4),
		BowlingLeft: new TV(...FilePaths.TVs.BowlingLeft),
		BowlingRight: new TV(...FilePaths.TVs.BowlingRight),
		PartyRoomTV: new TV(...FilePaths.TVs.PartyRoomTV),
		PoolHallEast: new TV(...FilePaths.TVs.PoolHallEast),
		PoolHallWest: new TV(...FilePaths.TVs.PoolHallWest),
		PoolHallSignage: new TV(...FilePaths.TVs.PoolHallSignage),
		BoardGameEast: new TV(...FilePaths.TVs.BoardGameEast),
		BoardGameWest: new TV(...FilePaths.TVs.BoardGameWest),
		HudsonLeft: new TV(...FilePaths.TVs.HudsonLeft),
		HudsonRight: new TV(...FilePaths.TVs.HudsonRight),
		GardenLeft: new TV(...FilePaths.TVs.GardenLeft),
		GardenRight: new TV(...FilePaths.TVs.GardenRight),
		MadisonLeft: new TV(...FilePaths.TVs.MadisonLeft),
		MadisonRight: new TV(...FilePaths.TVs.MadisonRight),
		MonroeLeft: new TV(...FilePaths.TVs.MonroeLeft),
		MonroeRight: new TV(...FilePaths.TVs.MonroeRight),
		JacksonLeft: new TV(...FilePaths.TVs.JacksonLeft),
		JacksonRight: new TV(...FilePaths.TVs.JacksonRight),
		
		FD_Test: new RokuTV("192.168.50.241", "FD_Test", 0),
		BW_Test: new VizioTV("192.168.50.102","BowlingMiddle4","Zff6mnb0td", "HDMI-3", "3487409261"),
		PP_Test: new AndroidTV("192.168.50.156", "PingPongNorth", "38:64:07:D1:97:74")
}
*/

function TVLoader(Scheme, Name, IP, Arg1, Arg2, Arg3){
	if(Scheme == "RK"){
		return new RokuTV(IP, Name, Arg1)
	} else if (Scheme == "AND") {
		return new AndroidTV(IP, Name, Arg1)
	} else if (Scheme == "VZ") {
		return new VizioTV(IP, Name, Arg1, Arg2, Arg3)
	} else {
		throw new Error("Scheme " + Scheme + " unrecognized")
	}
}


Devices = require("./etc/TVs.json")
Areas = require("./etc/Areas.json")

let TVs = {}
for(i in Devices.TVs){ 
	TVs[i] = TVLoader(...Devices.TVs[i])
} 


Control.TVs = TVs
Control.All = new ControlArea(Areas.All, TVs)

for( i in Areas.Bays){ 
	Control.Bays[i] = new ControlArea(Areas.Bays[i], TVs)
} 

for( i in Areas.Rooms){ 
	Control.Rooms[i] = new ControlArea(Areas.Rooms[i], TVs)
} 

exports.Control = Control