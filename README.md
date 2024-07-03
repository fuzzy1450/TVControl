## Usage
Use `./WebServer/RunServer.bat` to spin up the webserver on port 3000

## Requirements

+ `node.js`
+ `npm`

## Installation
Setup is rather involved.
1. TVs need to be properly configured to accept remote commands. See `Maintainence Info`
2. The Android Debug Tool (adb.exe) needs to be added to the PATH
3. Pray (to the Right Guy™️)

## Author
	Evan Kupsch
	6/2024
	ievank@me.com
	908-705-1908


## Project Layout
	./README.txt		- You're doing that
	./etc/			- External Files/Tools.
		platform-tools/		- Android Debug Toolkit (windows)
	./Schedule/*		- a file tree that dictates the schedule for opening/closing
	./RunSchedule.bat	- used by Task Scheduler to automate api calls to the server.
	
	./WebServer/		- The webserver itself!	
		etc/			- Data Files used by Server. Config files and the like
		logs/			- What else?
		resources/		- Files served to the clients. Everything in this folder is public!
		views/			- HTML files served to clients. Not public - only static pathing is used for retrieving views
		src/			- Source Folder. Modules inside can be imported with `require("src/Module")`
			ControlAPI.js		- The module which controls TVs
			main.js			- The Webserver
		RunServer.bat		- Batch script to launch the server
	


## Maintainence Info
The only files which should ever need maintainence will be 
* `./Schedule/*`
	+ These are schedule files. They should be pretty intuitive.
	+ Look at the commits/changes if you need help.
* `./WebServer/etc/`
	* `Areas.json`	- Zones of the Store
	* `TVs.json`	- Data for each TV
* `./WebServer/views/index.html`
	+ The main view for TVs. New TVs/Areas must be added.
		
	
	
### TV Info:
		- Roku (RK):
			The <arg> of this manufactor is the roku plugin id you want to display after powering on. 
				For TVs that use a physical input, keep the number as 0 and configure them to power on to that input
				For Rokiosk, that number is 50109
				To find the number of other plugins:
					1) Turn on a TV to the plugin you want the id of
					2) Visit http://<IP>:8060/query/media-player
			More info @ https://developer.roku.com/es-ar/docs/developer-program/dev-tools/external-control-api.md
		

		- Vizio (VZ):
			The <arg> of this manufactor is the Auth Key that is obtained from the pairing process
				https://github.com/exiva/Vizio_SmartCast_API?tab=readme-ov-file#pairing
			The Control function I implemented comes with a big asterisk: 
				Direct input jumping was detailed by the docs, but seemed non-functional on our TV
				In order to change inputs, an "input" button press is sent to the TV 3 times, in order to get it to the desired input
				However, the TV boots into a seemingly random application on startup.
					To mitigate this, the protocol first opens Netflix, putting the TV in a known state.
			More info @ https://github.com/exiva/Vizio_SmartCast_API
		

		- Android (AND)
			These are usually Hisense/Google TVs
			They are controlled using the android debugging tool, ADB
				The TV must be put into Developer Mode, and ADB must be enabled
				See here for button press codes: https://stackoverflow.com/questions/7789826/adb-shell-input-events
			Because of the way ADB works, mutex implementation was required. This is done via flock.
			The <arg> for this class of TVs is thier MAC address - some of these devices need to be sent a wake-on-lan packet. 
				It is not needed with all the AND TVs - for these, <arg> should be 0



### TODO

Save each reported Request Time, with each tv
Then, render delay-over-time graphs per TV / Bay, to monitor performance
