const { spawnSync } = require('child_process');
const https = require('https')

const ax = require('axios');
const axios = ax.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});

const ScriptType = {
	START: "Startup",
	STOP: "Shutdown",
	STATUS: "Status"
}



function RunScript(type, arg_path){
	return spawnSync('cmd.exe', ['/c','C:\\RokuControl\\WebServer\\scripts\\'+type+'.bat', arg_path]);
}

class ControlArea {
	constructor(FilePath){
		this.FilePath=FilePath
	}
	
	PowerOn(){
		return RunScript(ScriptType.START, this.FilePath)
	}

	PowerOff(){
		return RunScript(ScriptType.STOP, this.FilePath)
	}
	
	GetStatus(){
		return RunScript(ScriptType.STATUS, this.FilePath)
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
		axios.post('http://'+this.IP+':8060/keypress/PowerOn')
		.then(function (res){
			if(res.status == 200){
				if(this.StartupPluginID!=0){
					this.LaunchApp(this.StartupPluginID)
				} 
				cb.send({powerState:1})
			
			} else {
				if(retries > 0){
					return PowerOn(cb, retries-1)
				} else {
					throw new Error("Failed to turn on TV "+this.DeviceName+" - max retries reached")
				}
			}
		}).catch(function(err){
				console.log(err)
				cb.send({powerState:0})
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
				cb.send({powerState:0})
		})
	}

	GetStatus(cb){
		axios.get('http://'+this.IP+':8060/query/device-info')
		.then(function (res){
			if(res.status == 200){
				if(res.data.includes("PowerOn")){
					cb.send({powerState:1})
				} else {
					cb.send({powerState:0})
				}
			} else {
				cb.send({powerState:0})
			}
		}).catch(function(err){
				console.log(err)
				cb.send({powerState:0});
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
	
	dbg(cb, cmd_url){
		axios.get('https://'+this.IP+':7345'+cmd_url,  {headers:{"AUTH":this.AuthKey}})
		.then(function (res){
			if(res.status == 200){	
				console.log(res.data)
			}
		})
	}
	
	
	PowerOn(cb, retries=5){
		
		let TVOBJ = this
		this.GetStatus()
		.then(function(res){
			if(!res){
				axios.put('https://'+TVOBJ.IP+':7345/key_command/', {"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]},  {headers:{"AUTH":TVOBJ.AuthKey}})
				.then(function (res){
					if(res.status == 200){
						TVOBJ.powerState=1
						cb.send({powerState:TVOBJ.powerState})
					} else {
						if(retries > 0){
							PowerOn(cb, retries-1)
						} else {
							throw new Error("Failed to turn on TV "+TVOBJ.DeviceName+" - max retries reached")
						}
					}
				}).catch(function (err){
					console.log(err)
					cb.send({powerState:TVOBJ.powerState})
				})
			} else {
				cb.send({powerState:TVOBJ.powerState})
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
						cb.send({powerState:TVOBJ.powerState})
					} else {
						if(retries > 0){
							PowerOff(cb, retries-1)
						} else {
							throw new Error("Failed to turn off TV "+TVOBJ.DeviceName+" - max retries reached")
						}
					}
				}).catch(function (err){
					console.log(err)
					cb.send({powerState:TVOBJ.powerState})
				})
			} else {
				cb.send({powerState:TVOBJ.powerState})
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
					return 1
				} else {
					TVOBJ.powerState = 0
					return 0
				}
			} else {
				TVOBJ.powerState = 0
				return 0
			}
		}).catch(function(err){
			console.log(err)
		}).finally(function(res){
			if(cb){
				cb.send({powerState:TVOBJ.powerState})
			}
			return TVOBJ.powerState
		})
	}
}



const FilePaths = {
	All: "/mnt/c/RokuControl/TvLists/All.txt",
	Bays: {
		Garden: "/mnt/c/RokuControl/TvLists/Bays/Garden.txt",
		Hudson: "/mnt/c/RokuControl/TvLists/Bays/Hudson.txt",
		Jackson: "/mnt/c/RokuControl/TvLists/Bays/Jackson.txt",
		Madison: "/mnt/c/RokuControl/TvLists/Bays/Madison.txt",
		Monroe: "/mnt/c/RokuControl/TvLists/Bays/Monroe.txt",
	},
	Rooms: {
		Bowling: "/mnt/c/RokuControl/TvLists/Rooms/Bowling.txt",
		PingPong: "/mnt/c/RokuControl/TvLists/Rooms/PingPong.txt",
		FrontDesk: "/mnt/c/RokuControl/TvLists/Rooms/FrontDesk.txt",
		PartyRoom: "/mnt/c/RokuControl/TvLists/Rooms/PartyRoom.txt",
		PoolHall: "/mnt/c/RokuControl/TvLists/Rooms/PoolHall.txt",
		BoardGame: "/mnt/c/RokuControl/TvLists/Rooms/BoardGame.txt"
	},
	TVs: {
		TODO: "get data for every TV. See below for format",
		FrontDesk4: ["/mnt/c/RokuControl/TvLists/TVs/FrontDesk4.txt", "FrontDesk4"],
		FrontDesk3: ["/mnt/c/RokuControl/TvLists/TVs/FrontDesk3.txt", "FrontDesk3"],
		FrontDesk2: ["/mnt/c/RokuControl/TvLists/TVs/FrontDesk2.txt", "FrontDesk2"],
		FrontDesk1: ["/mnt/c/RokuControl/TvLists/TVs/FrontDesk1.txt", "FrontDesk1"],
		PingPongNorth: ["/mnt/c/RokuControl/TvLists/TVs/PingPongNorth.txt", "PingPongNorth"],
		PingPongMiddle: ["/mnt/c/RokuControl/TvLists/TVs/PingPongMiddle.txt", "PingPongMiddle"],
		PingPongSouth: ["/mnt/c/RokuControl/TvLists/TVs/PingPongSouth.txt", "PingPongSouth"],
		BowlingMiddle4: ["/mnt/c/RokuControl/TvLists/TVs/BowlingMiddle4.txt", "BowlingMiddle4"],
		BowlingLeft: ["/mnt/c/RokuControl/TvLists/TVs/BowlingLeft.txt", "BowlingLeft"],
		BowlingRight: ["/mnt/c/RokuControl/TvLists/TVs/BowlingRight.txt", "BowlingRight"],
		PartyRoomTV: ["/mnt/c/RokuControl/TvLists/TVs/PartyRoomTV.txt", "PartyRoomTV"],
		PoolHallEast: ["/mnt/c/RokuControl/TvLists/TVs/PoolHallEast.txt", "PoolHallEast"],
		PoolHallWest: ["/mnt/c/RokuControl/TvLists/TVs/PoolHallWest.txt", "PoolHallWest"],
		PoolHallSignage: ["/mnt/c/RokuControl/TvLists/TVs/PoolHallSignage.txt", "PoolHallSignage"],
		BoardGameEast: ["/mnt/c/RokuControl/TvLists/TVs/BoardGameEast.txt", "BoardGameEast"],
		BoardGameWest: ["/mnt/c/RokuControl/TvLists/TVs/BoardGameWest.txt", "BoardGameWest"],
		HudsonLeft: ["/mnt/c/RokuControl/TvLists/TVs/HudsonLeft.txt", "HudsonLeft"],
		HudsonRight: ["/mnt/c/RokuControl/TvLists/TVs/HudsonRight.txt", "HudsonRight"],
		GardenLeft: ["/mnt/c/RokuControl/TvLists/TVs/GardenLeft.txt", "GardenLeft"],
		GardenRight: ["/mnt/c/RokuControl/TvLists/TVs/GardenRight.txt", "GardenRight"],
		MadisonLeft: ["/mnt/c/RokuControl/TvLists/TVs/MadisonLeft.txt", "MadisonLeft"],
		MadisonRight: ["/mnt/c/RokuControl/TvLists/TVs/MadisonRight.txt", "MadisonRight"],
		MonroeLeft: ["/mnt/c/RokuControl/TvLists/TVs/MonroeLeft.txt", "MonroeLeft"],
		MonroeRight: ["/mnt/c/RokuControl/TvLists/TVs/MonroeRight.txt", "MonroeRight"],
		JacksonLeft: ["/mnt/c/RokuControl/TvLists/TVs/JacksonLeft.txt", "JacksonLeft"],
		JacksonRight: ["/mnt/c/RokuControl/TvLists/TVs/JacksonRight.txt", "JacksonRight"]
	}
}

const Control = {
	All: new ControlArea(FilePaths.All),
	Bays: {
		Hudson: new ControlArea(FilePaths.Bays.Hudson),
		Garden: new ControlArea(FilePaths.Bays.Garden),
		Madison: new ControlArea(FilePaths.Bays.Madison),
		Monroe: new ControlArea(FilePaths.Bays.Monroe),
		Jackson: new ControlArea(FilePaths.Bays.Jackson)
	},
	Rooms: {
		Bowling: new ControlArea(FilePaths.Rooms.Bowling),
		PingPong: new ControlArea(FilePaths.Rooms.PingPong),
		FrontDesk: new ControlArea(FilePaths.Rooms.FrontDesk),
		PartyRoom: new ControlArea(FilePaths.Rooms.PartyRoom),
		PoolHall: new ControlArea(FilePaths.Rooms.PoolHall),
		BoardGame: new ControlArea(FilePaths.Rooms.BoardGame)
	},
	
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
		BW_Test: new VizioTV("192.168.50.102","BowlingMiddle4","Zff6mnb0td", "HDMI-3", "3487409261")
		
	}
	
}

exports.Control = Control