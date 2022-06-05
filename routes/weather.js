const express = require('express');
const router = express.Router();

const validation = require('../utilities').validation;
const weatherUtils = require('../utilities').weatherUtils;
const convertTimeZone = weatherUtils.convertTimeZone;
const processWeather = weatherUtils.processCurrentWeather;
const processHourly = weatherUtils.processHourly;
const processDaily = weatherUtils.processDaily;

const isStringProvided = validation.isStringProvided;

const fetch = require('node-fetch');

const apiKey = process.env.WEATHER_API_KEY;

// Components of the weather api url
const apiURL = 'https://api.openweathermap.org/data/2.5/onecall';
const coords = (lat, lng) => {
    return `?lat=${lat}&lon=${lng}`;
};
const optionalParams = '&exclude=alerts,minutely&units=imperial';
const keyParam = `&appid=${apiKey}`;

/**
 * @api {get} /weather/?lat={latitude}&lng={longitude} Request formatted weather data with specified coordinates.
 * @apiName GetWeather
 * @apiGroup Weather
 *
 * @apiHeader {String} authorization "username:password" uses Basic Auth
 *
 * @apiSuccess {boolean} success true when API response processing is successful
 * @apiSuccess {String} currentWeather nicely formatted weather data
 * @apiSuccess {String} currentWeather nicely formatted current weather forecast data
 * @apiSuccess {String} hourlyData nicely formatted hourly weather forecast data
 * @apiSuccess {String} dailyData nicely formatted daily weather forecast data
 *
 *  * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 OK
 *     {
 *       "success": true,
 *       "currentWeather": {
 *                              temp: 69,
 *                              description: Clear Sky,
 *                              minTemp: 42,
 *                              maxtemp: 72,
 *                              humidity: 20,
 *                              feels_like: 63,
 *                              prob_precipitation: 0.2,
 *                              icon: 01d
 *                         },
 *       "hourlyData": {
 *                          [hours: 1, temp: 65, icon: 01d],
 *                          [hours: 2, temp: 65, icon: 01d],
 *                          [...],
 *                          [hours: 23, temp: 65, icon: 01d],
 *                     },
 *       "dailyData": {
 *                          [day: Sun, temp: 65, icon: 01d],
 *                          [day: Mon, temp: 65, icon: 01d],
 *                          [...],
 *                          [day: Sat, temp: 65, icon: 01d],
 *                    }
 *     }
 *
 * @apiError (404: Missing required information) {String} message "Missing required information"
 *
 * @apiError (404: Invalid parameters) {String} message "Invalid parameters"
 *
 * @apiError (400: API Request Failed) {String} message "Weather API request failed"
 *
 */
router.get(
    '/',
    (req, res, next) => {
        if (
            !(
                isStringProvided(req.query.lat) &&
                isStringProvided(req.query.lng)
            )
        ) {
            res.status(404).send({
                message: 'Missing required information',
            });
        } else if (isNaN(req.query.lat) || isNaN(req.query.lng)) {
            res.status(404).send({
                message: 'Invalid parameters',
            });
        } else next();
    },
    (req, res, next) => {
        const lat = req.query.lat;
        const lng = req.query.lng;

        const url = apiURL + coords(lat, lng) + optionalParams + keyParam;

        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                req.body.data = data;
                // console.log(data);
                next();
            })
            .catch((err) => {
                res.status(400).send({
                    message: 'Weather API request failed',
                    detail: err.detail,
                });
            });
    },
    // Perform data processing here
    convertTimeZone,
    processWeather,
    processHourly,
    processDaily,
    (req, res) => {
        res.status(201).send({
            success: true,
            currentWeather: req.body.processedCurrentData,
            hourlyData: req.body.hourlyData,
            dailyData: req.body.dailyData,
        });
    }
);

module.exports = router;
