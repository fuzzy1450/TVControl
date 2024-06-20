MaxAttempts=10
declare -A powerOn_PIDs
declare -A channelChange_PIDs

/mnt/c/RokuControl/etc/android-platform-tools/adb disconnect > /dev/null


tvFile="/mnt/c/RokuControl/Tvs.txt"

if [ -z $1 ]; then
	tvFile="/mnt/c/RokuControl/Tvs.txt"
else
	tvFile=$1
fi

readarray -t fileData < $tvFile
	


IFS=" "





function RokuOn() {
	read -ra addr <<< "${fileData[$1]}"
	printf ""
	until curl 'http://'"${addr[0]}"':8060/keypress/PowerOn' --head -X POST --output /dev/null --silent --fail; do
		printf "."
		sleep 1
	done
}
function RokuControl() {
	read -ra addr <<< "${fileData[$1]}"
	
	if [[ "${addr[1]}" != "0" ]]; then
		until curl --output /dev/null --silent --head -X POST --fail 'http://'"${addr[0]}"':8060/launch/'"${addr[1]}"; do
			printf '.'
			sleep 1
		done
	fi 
}

function VizioOn() {
	read -ra addr <<< "${fileData[$1]}"

	res=$(curl -k -H "Content-Type: application/json" -H "AUTH: Zff6mnb0td" -X GET 'https://'"${addr[0]}"':7345/state/device/power_mode' --silent)
	if [[ "$res" == *'"VALUE":0'* ]]; then
		until curl -k -H "Content-Type: application/json" -H "AUTH: ${addr[1]}" -X PUT -d '{"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]}' 'https://'"${addr[0]}"':7345/key_command/' --output /dev/null --silent --fail; do
			printf "."
			sleep 1
		done
	fi
}
function VizioControl() {
	read -ra addr <<< "${fileData[$1]}"
	# the vizio tv has a tendancy to open to either the last input or the home screen, 50/50 probability it seems
	# the docs say the API does support changing input directly
	# but it did not work in testing
	# so we must change the tv to a known state by forcing the application to Netflix
	
	
	until curl -k -H "Content-Type: application/json" -H "AUTH: ${addr[1]}" -X PUT -d '{"VALUE": {"MESSAGE": "None","NAME_SPACE": 3, "APP_ID":"1"}}' 'https://'"${addr[0]}"':7345/app/launch' --output /dev/null --silent --fail; do
			printf "."
			sleep 1
	done
	
	sleep 10
	
	# after netflix is open, we simply hit `input` 3 times and we will arrive where we need to be
	
	until curl -k -H "Content-Type: application/json" -H "AUTH: ${addr[1]}" -X PUT -d '{"KEYLIST": [{"CODESET": 7,"CODE": 1,"ACTION":"KEYPRESS"}]}' 'https://'"${addr[0]}"':7345/key_command/' --output /dev/null --silent --fail; do
			printf "."
			sleep 1
	done
	
	
	until curl -k -H "Content-Type: application/json" -H "AUTH: ${addr[1]}" -X PUT -d '{"KEYLIST": [{"CODESET": 7,"CODE": 1,"ACTION":"KEYPRESS"}]}' 'https://'"${addr[0]}"':7345/key_command/' --output /dev/null --silent --fail; do
			printf "."
			sleep 1
	done
	
	# after we know the state of the TV, we know there are 
	until curl -k -H "Content-Type: application/json" -H "AUTH: ${addr[1]}" -X PUT -d '{"KEYLIST": [{"CODESET": 7,"CODE": 1,"ACTION":"KEYPRESS"}]}' 'https://'"${addr[0]}"':7345/key_command/' --output /dev/null --silent --fail; do
			printf "."
			sleep 1
	done
	
}

function AndroidOn() {
	
	read -ra addr <<< "${fileData[$1]}"
	unconnected=true
	retries=0
	
	while [ "$unconnected" = true ] && [ "$retries" -le 3 ]; do
		(WoL "${addr[1]}" "${addr[0]}")
	
		: >> /mnt/c/RokuControl/etc/adb_lock #create a file if it doesn't exist
		{
			flock -x 4 #lock file by filedescriptor
			
			## mutex region begin

			deviceConnect=$(timeout 5 /mnt/c/RokuControl/etc/android-platform-tools/adb connect "${addr[0]}")
			
			
			if [[ "$deviceConnect" = "connected"* ]]; then
				unconnected=false
				
				# check if the display is on. if not, turn it on
				powerState=$(/mnt/c/RokuControl/etc/android-platform-tools/adb shell dumpsys power | grep "Display Power")
				if [ "${powerState}" = "Display Power: state=OFF" ]; then
					/mnt/c/RokuControl/etc/android-platform-tools/adb shell input keyevent 224
				fi
			else
				retries=$(($retries+1))
			fi
			
			/mnt/c/RokuControl/etc/android-platform-tools/adb disconnect > /dev/null
			
			## mutex region end
			
		} 4</mnt/c/RokuControl/etc/adb_lock
		sleep 0.05 # take a quick sleep, to give other processes a chance to grab the file
	done
}
function AndroidControl(){ 
	sleep 0.05
}

function WoL() {
	/mnt/c/RokuControl/etc/WoL.sh "$1" "$2" 7 > /dev/null
}

# first, power on the TVs
printf "Powering TVs"
for key in "${!fileData[@]}";
do
	read -ra addr <<< "${fileData[$key]}"
	
	if [ "${addr[2]}" = "RK" ]; then
		(RokuOn ${key})&
	
	elif [ "${addr[2]}" = "VZ" ]; then
		(VizioOn ${key})&
		
	elif [ "${addr[2]}" = "AND" ]; then
		(AndroidOn ${key})&
	fi
	
	powerOn_PIDs[${key}]=$!
done

# wait for the TVs to turn on.

for key in "${!fileData[@]}";
do
	read -ra addr <<< "${fileData[$key]}"
	printf "\nTV #$key (${addr[0]})"
	wait ${powerOn_PIDs[$key]}
	printf "\tPowered!"
done



# Now to change the TVs to the correct channel/inpit
printf "\nRunning Startup Routines"

for key in "${!fileData[@]}";
do

	read -ra addr <<< "${fileData[$key]}"
	
	if [ "${addr[2]}" = "RK" ]; then
		(RokuControl ${key})&
	
	elif [ "${addr[2]}" = "VZ" ]; then
		(VizioControl ${key})&
		
	elif [ "${addr[2]}" = "AND" ]; then
		(AndroidControl ${key})&
	fi
	
	
	channelChange_PIDs[${key}]=$!
done


# now we wait on child processes, so the script does not terminate early.
for key in "${!fileData[@]}";
do
	read -ra addr <<< "${fileData[$key]}"
	printf "\nTV #$key\t${addr[0]}"
	wait ${channelChange_PIDs[$key]}
	printf "\tDone"
done

printf "\n--- Script Completed ---\n"
