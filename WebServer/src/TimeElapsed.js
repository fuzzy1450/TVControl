class TimeElapsed {
	// This is a timer, 
	// It tracks the elapsed time between it's creation and the last UpdateTimer() call
	// UpdateTimer() will be done automatically only once, and only if it has not been called already
	// GetTime() will call UpdateTimer() if UpdateTimer() has not been called beforebegin
	// casting this timer to a string includes a GetTime() call
	
	
	
	constructor(){
		this.startTime=performance.now()
		this.endTime=-1
	}
	
	UpdateTimer(){
		this.endTime=performance.now()
		return this.endTime-this.startTime
	}
	
	GetTime(){
		if(this.endTime == -1){
			return this.UpdateTimer()
		}
		return this.startTime-this.endTime
	}
	
	toString(){
		let T = this.GetTime()
		if(T < 1000) {
			ms = T.toFixed(3)
			return `${ms}ms`
			
		} else if(T < 60000) {
			s = (T/1000).toFixed(3)
			return `${s}s`
			
		} else if(T < 3600000) {
			M = (T/60000).toFixed(0)
			s = ((T - (M * 60000))/1000).toFixed(3)
			return `${M}m:${s}s`
			
		} else {
			H = (T/3600000).toFixed(0)
			M = ((T - (H*3600000))/60000).toFixed(0)
			s = ((T - (M * 60000))/1000).toFixed(3)
			return `${H}H:${M}m:${s}s`
		}
	}
}

exports.Timer = TimeElapsed
