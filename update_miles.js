require('dotenv').config()
const fs = require('fs')
const core = require('@actions/core')

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

function getDistinctActivities(activites){
    // compares last 5 days activities with existing activities and 
    // stores the distinct activities inside the file activities.json
    const finished = (error) => {
        if(error){
            console.error(error)
            return;
        }
    }

    const filePath = './src/activities.json'
    var allActivities = activites

    if (fs.existsSync(filePath)){
        fs.stat(filePath, (err, stats) => {
            if(err){
                console.error(err)
                return;
            }
        })
        const isEmpty = stats.size === 0
        if(!isEmpty){
            const existingActivities = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            allActivities = existingActivities.concat(activites)
        }
    }

    const uniqueIds = {}
    const distinctActivities = allActivities.filter(obj => {
        if(!uniqueIds[obj.id]){
            uniqueIds[obj.id] = true
            return true
        }
        return false
    })

    return distinctActivities
}

async function execute(){
    // updates activites.json with recent running activities from strava
    const auth = await reAuthorize()
    const running_activities = await getRunningActivities(auth)
    const distinct_activities = getDistinctActivities(running_activities)
    
    core.setOutput('ACTIVITIES', distinct_activities)
}

execute()