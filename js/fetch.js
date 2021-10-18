/**
 * A reusable fetch function that takes the url as the parameter,
 * initializes the response variable with the response object
 * Then returns the object as json
 * @param url
 * @returns {Promise<any>}
 */
async function fetchData(url) {
    const response = await fetch(url)
    return await response.json()
}
