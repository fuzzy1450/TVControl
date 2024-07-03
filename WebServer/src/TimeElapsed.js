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
		} else {
			return this.startTime-this.endTime
		}
	}
	
	toString(){
		let T = this.GetTime()
		return TimeToString(T)
	}

}

class TimeSummary{
	constructor(count, min, max, sum, avg){
		this.count = count
		this.min = min
		this.max = max
		this.sum = sum
		this.avg = avg
	}
	
	toString(){
		return `TimeStats | count:${this.count} | min:${TimeToString(this.min)} | max:${TimeToString(this.max)} | sum:${TimeToString(this.sum)} | avg:${TimeToString(this.avg)}`
	}
}


function TimeToString(T){
		let ms, s, M, H
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

function Summarize(Ts){
		let sum = 0
		let avg = 0
		let min = -1
		let max = -1
		let n=0
		for(i in Ts){
			let T = Ts[i]
			sum+=T
			if(min==-1 || T < min){
				min = T
			}
			if(max==-1 || T > max){
				max = T
			}
			n++
		}
		
		avg = sum/n
		
		return new TimeSummary(n, min, max, sum, avg)
	}

TimerUtils = {
	TimeToString: TimeToString,
	Summarize: Summarize
}

exports.Timer = TimeElapsed
exports.TimerUtils = TimerUtils