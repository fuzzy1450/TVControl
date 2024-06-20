declare -A status_PIDs
/mnt/c/RokuControl/etc/android-platform-tools/adb disconnect > /dev/null

tvFile="/mnt/c/RokuControl/Tvs.txt"

if [ -z $1 ]; then
	tvFile="/mnt/c/RokuControl/Tvs.txt"
else
	tvFile=$1
fi
	
readarray -t fileData < $tvFile
	

IFS=' '

# this functions allows for mutex when printing to the console
# this is important when stdout is used to pass important data from a multithreaded application
# to ensure that your printed data is well-ordered
function PrintString_ThreadSafe() {
	: >> /mnt/c/RokuControl/etc/writeback_lock #create a file if it doesn't exist
	{
		flock 8 #lock file by filedescriptor
		
		printf "\n""$1""$2""$3""$4"
			
	} 8</mnt/c/RokuControl/etc/writeback_lock
}


function RokuStatus() {
	read -ra addr <<< "${fileData[$1]}"
	
	queryResult=""
	
	until [ -n "$(echo $queryResult | grep "power-mode" )" ]; do 
		queryResult=$(curl --silent -X GET --fail 'http://'"${addr[0]}"':8060/query/device-info'); 
		sleep 0.5;
	done
	
	if [ -n "$(echo $queryResult | grep 'PowerOn')" ]; then
		PrintString_ThreadSafe "${addr[3]}:On"
	else 
		PrintString_ThreadSafe "${addr[3]}:Off"
	fi
}


function VizioStatus() {
	read -ra addr <<< "${fileData[$1]}"

	res=$(curl -k -H "Content-Type: application/json" -H "AUTH: Zff6mnb0td" -X GET 'https://'"${addr[0]}"':7345/state/device/power_mode' --silent)
	if [[ "$res" == *'"VALUE":1'* ]]; then
		PrintString_ThreadSafe "${addr[3]}:On"
	else
		PrintString_ThreadSafe "${addr[3]}:Off"
	fi
}

function AndroidStatus() {
	
	read -ra addr <<< "${fileData[$1]}"
	unconnected=true
	retries=0
	
	while [ "$unconnected" = true ] && [ "$retries" -le 3 ]; do
	
		: >> /mnt/c/RokuControl/etc/adb_lock #create a file if it doesn't exist
		{
			flock 4 #lock file by filedescriptor

			## mutex region begin

			deviceConnect=$(timeout 5 /mnt/c/RokuControl/etc/android-platform-tools/adb connect "${addr[0]}")
			
			if [[ "$deviceConnect" = "connected"* ]]; then
				unconnected=false
			
				# check if the display is on. if not, turn it on
				powerState=$(/mnt/c/RokuControl/etc/android-platform-tools/adb shell dumpsys power | grep "Display Power")
				if [ "${powerState}" = "Display Power: state=ON" ]; then
					PrintString_ThreadSafe "${addr[3]}:On"
				else
					PrintString_ThreadSafe "${addr[3]}:Off"
				fi
			else
				retries=$(($retries+1))
			fi
			
			
			
			/mnt/c/RokuControl/etc/android-platform-tools/adb disconnect > /dev/null
			
			## mutex region end
			
		} 4</mnt/c/RokuControl/etc/adb_lock
	done
}


# this string is the start-sequence. 
# the output of this program will be passed to the process that executes it
# that process will be looking for the status of the devices it gets back
# printing this sequence makes it easy to find the important data from stdout
SQ="SQ8958.54"
PrintString_ThreadSafe "$SQ"

for key in "${!fileData[@]}";
do
	read -ra addr <<< "${fileData[$key]}"
	
	if [ "${addr[2]}" = "RK" ]; then
		(RokuStatus ${key})&
	
	elif [ "${addr[2]}" = "VZ" ]; then
		(VizioStatus ${key})&
		
	elif [ "${addr[2]}" = "AND" ]; then
		(AndroidStatus ${key})&
	fi
	
	status_PIDs[${key}]=$!
done

# wait for the TVs to respond.
for key in "${!fileData[@]}";
do
	wait ${status_PIDs[$key]}
done


#print the sequence string again
PrintString_ThreadSafe "$SQ"

