module.exports = function (app) {
    const plugin = {};
    let sequenceLength = 300
    let raceStartsAt = secsNow() + sequenceLength
    let timer = null

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
        updateState(true);
        timer = setInterval(() => {
            let tts = raceStartsAt - secsNow() ;
            updateTts(tts)
            if( tts <= 0 ){
                stopTimer()
            }
        }, 250);
    }

    function syncTimer() {
        app.debug('syncTimer')
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
