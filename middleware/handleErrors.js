let jsonErrorInBody = (err, request, response, next) => {

    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        response.status(400).send({ message: "malformed JSON in parameters" })
    } else {
        next()
    }
  }

  module.exports = {
    jsonErrorInBody: jsonErrorInBody
  }