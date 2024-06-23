// Magic string used to mark and locate important data
const Sequence_Marker = "SQ8958.54"


function apiRequest(Class, Name, RequestType){
	ShowLoadingNotif()
	url = ""
	if (Class=="All"){
		url = '/api/'+Class+'/'+RequestType
	} else {
		url = '/api/'+Class+'/'+Name+'/'+RequestType
	}

	return fetch(url, {method: 'POST'})
	.then(function(response) {
		if(response.ok) {
			return response.json()
		} else {
			throw new Error('Request failed.')
		}
	})
	.then(function(data){
		if(data == null){
			return;
		}
		if(Class == "TVs"){
			data = [data]
		}
		
		for(i in data){
			let Status = data[i]
			let tvName = Status.name 
			let powerState = Status.powerState
			let err = Status.ERR
			
			let tvElem=document.getElementById(tvName)
				
			if(tvElem){
				if(err){
					tvElem.classList.remove("off")
					tvElem.classList.remove("on")
					tvElem.onclick=function(){}
					tvElem.classList.add("DeviceErr")
					
				} else if (powerState==1){
					tvElem.classList.remove("off")
					tvElem.classList.add("on")
					tvElem.onclick=onclickGenerator(tvName, "PowerOff")
				} else {
					tvElem.classList.remove("on")
					tvElem.classList.add("off")
					
					tvElem.onclick=onclickGenerator(tvName, "PowerOn")
				}
			} else {
				console.warn("could not update display for TV " + tvName)
			}
			
		}
		
		return;
	}).then(function(data){
		HideLoadingNotif()
	})
	.catch(function(error) {
		console.log(error);
		HideLoadingNotif()
    });
}

function intToChar(x){ // Gets the char representation of the int X. 
	return String.fromCharCode(x)[0]
}

function onclickGenerator(tvName, RequestType){
	 return function(){apiRequest("TVs", tvName, RequestType)}
}


function initStatusRefresh() {
	TVs = document.getElementsByClassName("TV");
	TVCount=TVs.length
	
	NameList=[]
	
	for(i=0; i<TVCount; i++){
		NameList.push(TVs[i].id)
	}
	
	StatusRefreshTask(NameList, TVCount)
}

function StatusRefresh(Class,Name){
	apiRequest(Class, Name, "GetStatus")
	
}

function StatusRefreshTask(TVNameList, TVCount){
	apiRequest("All", "", "GetStatus")
	
	setTimeout( StatusRefreshTask, 5000, TVNameList, TVCount );
	
}

let ProcessesLoading = 0;

function ShowLoadingNotif(){
	ProcessesLoading++
	document.getElementById("Loading").style.display="block"
}

function HideLoadingNotif(){
	ProcessesLoading--
	if(ProcessesLoading==0){
		document.getElementById("Loading").style.display="none"
	}
}

