const _getBaseUrl = () => {
    if (process.env.ENV === "prod") {
        return process.env.BASEURL_PROD
    } else if  (process.env.ENV === "dev") {
        return process.env.BASEURL_DEV
    } else {
        throw new Error(`Invalid ENV value: ${process.env.ENV}. Change config.`)
    }
}

export const SURVEY_URL = 'https://qot2dz1necm.typeform.com/to/YXpg6Ykp'

export const BASEURL =  _getBaseUrl()

export const GOOGLE = "google";

