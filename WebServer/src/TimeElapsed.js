class TimeElapsed {
	constructor(){
		this.startTime=performance.now()
		this.endTime=-1
	}
	
	UpdateTimer(){
		this.endTime=performance.now()
		return this.endTime-this.startTime
	}
	
	GetTime(){
		if(endTime != -1)}{
			return UpdateTimer()
		}
		return this.endTime-this.startTime
	}
}

exports.Timer = TimeElapsed
