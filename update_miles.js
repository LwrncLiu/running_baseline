const fs = require('fs')

async function reAuthorize(){
    // obtains a new access token from strava
    const auth_link = 'https://www.strava.com/api/v3/oauth/token'

    const response = await fetch(auth_link,{
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        
        body: JSON.stringify({
            client_id: '99458',
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            refresh_token: process.env.STRAVA_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        })
    })

    const auth = await response.json()
    return auth
}

async function getRunningActivities(res){
    // gets running activities of past 5 days from strava
    function selectFields(activity){
        // only selects the fields below from a strava activity
        const {name, distance, moving_time, start_date_local, id} = activity
        return {name, distance, moving_time, start_date_local, id}
    }

    function epochLowerBound(){
        // finds the epoch time of 5 days from local run datetime
        const today = new Date()
        const fiveDaysAgo = new Date(today)
        fiveDaysAgo.setDate(today.getDate() - 15)
        return Math.floor(fiveDaysAgo.getTime() / 1000)
    }

    const lookback_epoch = epochLowerBound()
    const link = `https://www.strava.com/api/v3/athlete/activities?after=${lookback_epoch}&access_token=${res.access_token}`

    const response = await fetch(link)
    const activites = await response.json()
    
    const running_activities = activites.filter( e => e.type == 'Run').map(selectFields)
    
    return running_activities
}

function updateFile(activites){
    // compares last 5 days activities with existing activities and 
    // stores the distinct activities inside the file activities.json
    const finished = (error) => {
        if(error){
            console.error(error)
            return;
        }
    }

    const fileName = 'activities.json'
    var allActivities = activites

    if (fs.existsSync(fileName)){
        const existingActivities = JSON.parse(fs.readFileSync(fileName, 'utf8'))
        allActivities = existingActivities.concat(activites)
    }

    const uniqueIds = {}
    const distinctActivities = allActivities.filter(obj => {
        if(!uniqueIds[obj.id]){
            uniqueIds[obj.id] = true
            return true
        }
        return false
    })

    const jsonData = JSON.stringify(distinctActivities, null, 2)
    fs.writeFile(fileName, jsonData, finished)
}

async function execute(){
    // updates activites.json with recent running activities from strava
    const auth = await reAuthorize()
    const running_activities = await getRunningActivities(auth)
    updateFile(running_activities)
}

execute()