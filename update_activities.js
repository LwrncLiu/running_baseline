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

async function getExistingActivities(filePath){
    let existingActivities = []
    if (fs.existsSync(filePath)){
        console.log('file exists')
        fs.stat(filePath, (err, stats) => {
            if(err){
                console.error(err)
                return;
            }
            const isEmpty = stats.size <= 1
            console.log('empty', isEmpty)
            if(!isEmpty){
                existingActivities = JSON.parse(fs.readFile(filePath, 'utf8', (err, data) => {
                    if(err) throw err 
                    return data
                }))
                console.log('existing', existingActivities)
            }
        })
    }
    return existingActivities
}

async function getDistinctActivities(activites){
    // compares last 5 days activities with existing activities and 
    // stores the distinct activities inside the file activities.json
    const filePath = './src/activities.json'

    existingActivities = await getExistingActivities(filePath)
    console.log('existing activites', existingActivities)
    combinedActivities = existingActivities.concat(activites)

    const uniqueIds = {}
    console.log('after statement, ', combinedActivities)
    const distinctActivities = combinedActivities.filter(obj => {
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
    const distinct_activities = await getDistinctActivities(running_activities)
    console.log(distinct_activities)
    core.setOutput('ACTIVITIES', distinct_activities)
}

execute()