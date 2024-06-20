declare -A powerOff_PIDs
/mnt/c/RokuControl/etc/android-platform-tools/adb disconnect > /dev/null

tvFile="/mnt/c/RokuControl/Tvs.txt"

if [ -z $1 ]; then
	tvFile="/mnt/c/RokuControl/Tvs.txt"
else
	tvFile=$1
fi
	
readarray -t fileData < $tvFile
	

IFS=' '

function PrintString_ThreadSafe() {
	: >> /mnt/c/RokuControl/etc/writeback_lock #create a file if it doesn't exist
	{
		flock 8 #lock file by filedescriptor
		
		printf "\n""$1""$2""$3""$4"
			
	} 8</mnt/c/RokuControl/etc/writeback_lock
}



function RokuOff() {
	read -ra addr <<< "${fileData[$1]}"
	printf ""
	until curl --output /dev/null --silent --head -X POST --fail 'http://'"${addr[0]}"':8060/keypress/PowerOff'; do
		printf "."
		sleep 0.5
	done
}


function VizioOff() {
	read -ra addr <<< "${fileData[$1]}"

	res=$(curl -k -H "Content-Type: application/json" -H "AUTH: Zff6mnb0td" -X GET 'https://'"${addr[0]}"':7345/state/device/power_mode' --silent)
	if [[ "$res" == *'"VALUE":1'* ]]; then
		until curl -k -H "Content-Type: application/json" -H "AUTH: ${addr[1]}" -X PUT -d '{"KEYLIST": [{"CODESET": 11,"CODE": 0,"ACTION":"KEYPRESS"}]}' 'https://'"${addr[0]}"':7345/key_command/' --output /dev/null --silent --fail; do
			printf "."
			sleep 0.5
		done
	fi
}

function AndroidOff() {
	
	read -ra addr <<< "${fileData[$1]}"
	unconnected=true
	retries=0
	
	while [ "$unconnected" = true ] && [ "$retries" -le 3 ]; do
	
		: >> /mnt/c/RokuControl/etc/adb_lock #create a file if it doesn't exist
		{
			flock 4 #lock file by filedescriptor

			## mutex region begin

			deviceConnect=$(timeout 10 /mnt/c/RokuControl/etc/android-platform-tools/adb connect "${addr[0]}")
			
			if [[ "$deviceConnect" = "connected"* ]]; then
				unconnected=false
			
				# check if the display is on. if not, turn it on
				powerState=$(/mnt/c/RokuControl/etc/android-platform-tools/adb shell dumpsys power | grep "Display Power")
				if [ "${powerState}" = "Display Power: state=ON" ]; then
					/mnt/c/RokuControl/etc/android-platform-tools/adb shell input keyevent 26
				fi
			else
				retries=$(($retries+1))
			fi
			
			
			
			/mnt/c/RokuControl/etc/android-platform-tools/adb disconnect > /dev/null
			
			## mutex region end
			
		} 4</mnt/c/RokuControl/etc/adb_lock
		sleep 0.05 # sleep, to give another process a chance to grab the file
	done
}

for key in "${!fileData[@]}";
do
	read -ra addr <<< "${fileData[$key]}"
	
	if [ "${addr[2]}" = "RK" ]; then
		(RokuOff ${key})&
	
	elif [ "${addr[2]}" = "VZ" ]; then
		(VizioOff ${key})&
		
	elif [ "${addr[2]}" = "AND" ]; then
		(AndroidOff ${key})&
	fi
	
	powerOff_PIDs[${key}]=$!
done

# wait for the TVs to turn on.

for key in "${!fileData[@]}";
do
	read -ra addr <<< "${fileData[$key]}"
	printf "\nTV #$key (${addr[0]})"
	wait ${powerOn_PIDs[$key]}
	printf "\tPowered Off!"
done

