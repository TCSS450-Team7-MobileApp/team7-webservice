/**
 * Convert to the correct timezone using the provided offset
 */
const convertTimeZone = (req, res, next) => {
    const currentTime = new Date();

    const currentUTC =
        currentTime.getTime() + currentTime.getTimezoneOffset() * 60000;

    const currentTimeLoc = currentUTC + req.body.data.timezone_offset * 1000;

    req.body.currTime = currentTimeLoc;

    next();
};

/**
 * Grabs and process the neccessary data from the api
 */
const processCurrentWeather = (req, res, next) => {
    if (req.body.data === undefined) {
        res.status(400).send({
            message: 'Missing required weather information',
        });
    } else {
        // grabs data
        const temp = Math.round(req.body.data.current.temp);

        const descriptionInput = req.body.data.current.weather[0].description;
        const description = descriptionInput.replace(
            /(^\w{1})|(\s+\w{1})/g,
            (letter) => letter.toUpperCase()
        );

        const minTemp = Math.round(req.body.data.daily[0].temp.min);
        const maxTemp = Math.round(req.body.data.daily[0].temp.max);
        const humidity = Math.round(req.body.data.current.humidity);
        const feels_like = Math.round(req.body.data.current.feels_like);
        const prob_precipitation = req.body.data.hourly[0].pop;
        const icon = req.body.data.current.weather[0].icon;

        req.body.processedCurrentData = {
            temp: temp,
            description: description,
            minTemp: minTemp,
            maxTemp: maxTemp,
            humidity: humidity,
            feels_like: feels_like,
            prob_precipitation: prob_precipitation,
            icon: icon,
        };

        next();
    }
};

/**
 * Process hourly data from the api by
 * taking and formatting the neccessary components
 */
const processHourly = (req, res, next) => {
    let hours = [];
    let hourValue, tempVal, icon;
    const readableDate = new Date(req.body.currTime);

    hourValue = readableDate.getHours();

    for (let i = 0; i < 24; i++) {
        tempVal = Math.round(req.body.data.hourly[i].temp);
        icon = req.body.data.hourly[i].weather[0].icon;

        hours[i] = {
            hours: hourValue,
            temp: tempVal,
            icon: icon,
        };

        hourValue = (hourValue + 1) % 24;
    }

    req.body.hourlyData = hours;
    next();
};

/**
 * Process daily data from the api by
 * taking and formatting the neccessary components
 */
const processDaily = (req, res, next) => {
    let days = [];
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const readableDate = new Date(req.body.currTime);
    let dayIndex = readableDate.getDay();

    for (let i = 0; i < 7; i++) {
        const currentDay = dayHeaders[dayIndex];
        const dayTemp = Math.round(req.body.data.daily[i].temp.day);
        const dayIcon = req.body.data.daily[i].weather[0].icon;

        days[i] = {
            day: currentDay,
            temp: dayTemp,
            icon: dayIcon,
        };

        dayIndex = (dayIndex + 1) % 7;
    }

    req.body.dailyData = days;
    next();
};

module.exports = {
    convertTimeZone,
    processCurrentWeather,
    processHourly,
    processDaily,
};
