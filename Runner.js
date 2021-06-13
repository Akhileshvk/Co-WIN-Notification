const axios = require('axios').default
const moment = require('moment')

var users = require("./users.json")

module.exports = class Runner {
    static async run() {
        console.log("Running @ " + moment().format('MMMM Do YYYY, h:mm:ss a'))
        
        users.forEach(async user => {
            let centers = await this.calendarByDistrict(user.district, moment().format("DD-MM-YYYY"))
            this.checkForVaccine(user, centers)
        })
    }

    static async findByDistrict(district_id, date) {
        let sessions = []
        axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=${district_id}&date=${date}`)
            .then(function (response) {
                // console.log(response.data)
                sessions = response.data.sessions
            })
            .catch(function (error) {
                console.log(error)
            })
        return sessions
    }

    static async calendarByDistrict(district_id, date) {
        let centers = []
        await axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${district_id}&date=${date}`)
            .then(function (response) {
                console.log("API Response Center Count: ", response.data.centers.length)
                centers = response.data.centers
            })
            .catch(function (error) {
                console.log(error)
            })
        return centers
    }    

    static async checkForVaccine(user, centers) {
        let filteredCenters = await this.filterCenters(centers, user.filters)       
        console.log("Filtered Center Count: ", filteredCenters.length) 
        // console.log(filteredCenters) 

        if (filteredCenters.length > 0) {
            let notificationMessage = await this.getNotificationMessage(filteredCenters)
            console.log(notificationMessage) 
            this.sendNotification(notificationMessage, user.notification_api)
        }
    }
    
    static async filterCenters(centers, filters) {
        return centers.filter(center => {
            if (filters.center_ids && filters.center_ids.length > 0 && !filters.center_ids.includes(center.center_id) ) {
                return false
            }
            if (filters.pincodes && filters.pincodes.length > 0 && !filters.pincodes.includes(center.pincode) ) {
                return false
            }
            if (filters.fee_types && filters.fee_types.length > 0 && !filters.fee_types.includes(center.fee_type) ) {
                return false
            }
            center.sessions = center.sessions.filter(session => {
                
                if (filters.vaccines && filters.vaccines.length > 0 && !filters.vaccines.includes(session.vaccine) ) {
                    return false
                }
                if (filters.min_age_limit && session.min_age_limit > filters.min_age_limit ) {
                    return false
                }
                if (session.available_capacity < filters.available_capacity ) {
                    return false
                }
                if (session.available_capacity_dose1 < filters.available_capacity_dose1 ) {
                    return false
                }
                return true
            })

            if(center.sessions.length == 0){
                return false
            }
            
            if (this.getDistanceToCenterFromHome(center) > filters.max_distance_km) {
                return false
            }

            console.log(center)
            return true
        })
    }

    static async getDistanceToCenterFromHome(center) {
        return 20
    }

    static async getNotificationMessage(filteredCenters) {
        let message = ""
        filteredCenters.forEach((center, index) => {
            message += `(${center.pincode}) ${center.address}, `
            center.sessions.forEach(session => {
                message += `${session.available_capacity} on ${session.date}` + "\n"            
            })            
        })
        return message
    }

    static sendNotification(message, notification_api) {
        let postData = {
            ...notification_api,
            content : message,
        }
        axios.post('https://api.pushed.co/1/push', postData)
    }
}