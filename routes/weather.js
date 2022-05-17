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

// Call the endpoint with https://url/weather?lat=123&lng=123
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
