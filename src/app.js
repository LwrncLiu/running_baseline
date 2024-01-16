import Calendar from './calendar.js'

async function getActivities() {
    const response = await fetch('activities.json')
    const activities = await response.json()
    return activities
}

function processActivities(activites){
    
    function compare(a, b){
        // turn string dates into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.start_date_local) - new Date(b.start_date_local)
    }

    function addRunningTotal(activities){
        var running_total = 0
        activities.map(x => {
            running_total += x.distance
            x.running_total_distance = running_total
            return x
        })
    }

    function metersToMiles(activites){
        const km_to_mile = 0.621371
        activites.map(x => {
            x.distance = x.distance * km_to_mile / 1000
            return x
        })
    }
    
    activites.sort(compare)
    metersToMiles(activites)
    addRunningTotal(activites)
    return activites
}

function draw(activites){

    console.log(activites)
    const runningCalendar = Calendar(activites, {
        x: d => new Date(d.start_date_local),
        y: d => d.distance,
        "weekday": "sunday"
    })
    d3.select('#calendar').append(() => runningCalendar)
}

window.addEventListener('DOMContentLoaded', async() => {
    var activities = await getActivities()
    activities = processActivities(activities)
    draw(activities)
})

