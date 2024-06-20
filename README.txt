Usage: 
	Use the .bat files to turn on/off the roku machines on the local network.

	If you run the scripts themselves, they take 1 argument, that is the path to the tv file you desire.

Author:
	Evan Kupsch
	6/2024
	ievank@me.com
	908-705-1908


Maintainence Info:
	The only files which should ever need maintainence will be the TV lists
		These are the .txt files in ./TvLists/
		Ensure these files are using Unix Style newlines. I accomplish this with Notepad++.
		Each line of these files is in the format "<IP> <arg> <manufacter code>"
			The IPs for each TV will need to be static, so please create a DHCP reservations for them.

	TV Info:
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


	
	This script uses absolute paths, so if you ever move it's directory, the scripts will have to be edited.
		In both files, that absolute path is at the top.


		

	



Changelog:
	
	06/12/2024 
		+ Script no longer completely blocks on a failed tv
		+ Supporting various TVs with various protocols
			= Currently supports Roku and Vizio

	06/13/2024
		+ Now supports Android TVs
			= Implemented ADB to control these devices
		+ Added WoL functionality
		+ You can now pass different tv.txt files to the .sh scripts, as the first argument
			= Created files for Hudson, Garden, Madison, Monroe, Jackson, and Bowling
	
	06/14/2024
		+ Created an accompanying Webserver to better control TVs, see /WebServer/
		+ Created TV files for FrontDesk and PingPong


