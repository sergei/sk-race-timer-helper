module.exports = function (app) {
    const plugin = {};

    const NOTIFY_AT = [5 * 60, 4*60 + 30, 4*60, 3*60 + 30, 3*60, 2*60 + 30, 2*60, 60 + 30, 60, 50, 40, 30, 20, 15,
      10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

    let sequenceLength = 300
    let raceStartsAt = secsNow() + sequenceLength
    let timer = null
    let notifyIdx = 0

    plugin.id = 'sk-race-timer-helper'
    plugin.name = 'Race Timer helper'
    plugin.description = 'This is SignalK plugin to provide all paths necessary for SignalK sk-race-timer Web App'

    function secsNow() {
        const [seconds, nanos] = process.hrtime();
        return seconds + nanos / 1000000000.;
    }

    function startTimer(sequenceLength){
        app.debug('startTimer')
        raceStartsAt = secsNow() + sequenceLength
        notifyIdx = 0
        updateState(true);
        timer = setInterval(() => {
            let tts = raceStartsAt - secsNow()
            updateTts(tts)
            updateNotification(tts)
            if( tts <= 0 ){
                stopTimer()
            }
        }, 250);
    }

    function syncTimer() {
        app.debug('syncTimer')
        // Round the remaining time to the nearest minute
        const currentTts = raceStartsAt - secsNow()
        const desiredTts = Math.round(Math.round(currentTts/60.) * 60.)
        raceStartsAt = secsNow() + desiredTts
    }

    function stopTimer(){
        app.debug('stopTimer')
        updateTts(sequenceLength)
        updateState(false);
        if( timer ){
            clearInterval(timer)
        }
    }

    function updateTts(tts) {
        app.debug('timeToStart', tts)
        app.handleMessage('sk-race-timer-helper', {
            updates: [
                {
                    values: [
                        {
                            path: 'navigation.racing.timeToStart',
                            value: tts
                        }
                    ]
                }
            ]
        })
    }

    function updateNotification(tts){
        for(let i = notifyIdx; i < NOTIFY_AT.length; i++){
            if( tts <= NOTIFY_AT[i]){  // issue notification
                const message = formatTime(NOTIFY_AT[i])
                app.debug(`tts=${tts} ${message}`)
                app.handleMessage('sk-race-timer-helper', {
                    updates: [
                        {
                            values: [
                                {
                                    path: 'navigation.racing.notifications',
                                    value: { method: 'sound', state: 'active', message: message }
                                }
                            ]
                        }
                    ]
                })
                notifyIdx = i + 1  // Advance to the next one
                break
            }
        }
    }

    function formatTime(tts){
        let s;
        if(tts >= 60){
            const minutes = Math.trunc(tts / 60)
            const seconds = tts - minutes * 60
            if(seconds === 0)
                s = `${minutes} minutes to start`
            else if (seconds === 30)
                s = `${minutes} and a half to start`
            else
                s = `${minutes} ${seconds}`
        }else if (tts > 10){
            s = `${tts} seconds`
        }else{
            s = `${tts}`
        }
        return s
    }


    function updateState(isAcive) {
        app.debug('updateState', isAcive)
        app.handleMessage('sk-race-timer-helper', {
            updates: [
                {
                    values: [
                        {
                            path: 'navigation.racing.state',
                            value: isAcive ? 'preparatory' : 'idle'
                        }
                    ]
                }
            ]
        })
    }

    function myActionHandler(context, path, value, callback) {
        app.debug('Put ', path, value )
        const tts = parseInt(value)
        if ( isNaN(tts)){
            return { state: 'COMPLETED', statusCode: 400 }
        }

        if( tts === 0){
            stopTimer()
        }else if ( tts < 0) {
            syncTimer()
        }else{
            startTimer(sequenceLength)
        }

        return { state: 'COMPLETED', statusCode: 200 };
    }

    plugin.start = function (options, restartPlugin) {
        // Here we put our plugin logic
        app.debug('Plugin started');
        updateTts(sequenceLength);
        updateState(false);
        app.registerPutHandler('vessels.self', 'navigation.racing.timeToStart', myActionHandler, plugin.id);
    }

    plugin.stop = function () {
        // Here we put logic we need when the plugin stops
        app.debug('Plugin stopped');
        stopTimer()
    }

    plugin.schema = {
        // The plugin schema
    }

    return plugin
}
