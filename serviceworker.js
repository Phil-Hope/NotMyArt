const cacheVersion = '0'

const currentCaches = {
    css: 'CSS-' + cacheVersion + '.2',
    imgs: 'images-' + cacheVersion + '.1',
    perm: 'perm-' + cacheVersion + '.1'
}

const cachesToDelete = [
    'CSS',
    'images',
    'CSS-0.1'
]

// cache object with 'css', 'imgs' and 'perm' properties
const cacheFiles = {
    css: [
        'http://localhost:8080/css/style.css'
    ],
    imgs: [
        'http://localhost:8080/imgs/PHiLSART.png',
        'http://localhost:8080/imgs/art1.png',
        'http://localhost:8080/imgs/art2.png',
        'http://localhost:8080/imgs/art3.png',
        'http://localhost:8080/imgs/art4.png',
        'http://localhost:8080/imgs/art5.png',
        'http://localhost:8080/imgs/art6.png',
        'http://localhost:8080/imgs/art7.png',
        'http://localhost:8080/imgs/art8.png',
        'http://localhost:8080/imgs/art9.png',
        'http://localhost:8080/imgs/art10.png',
        'http://localhost:8080/imgs/art11.png',
        'http://localhost:8080/imgs/art12.png',
        'http://localhost:8080/imgs/art13.png',
        'http://localhost:8080/imgs/art14.png',
        'http://localhost:8080/imgs/spring-disc.png',
        'http://localhost:8080/imgs/header.png'
    ],
    perm: [
        'https://fonts.googleapis.com/css?family=Roboto:400,500,700',
        'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css'
    ]
}

// imports the locally saved localforage js file
importScripts('js/localforage.min.js')

const dbName = 'store'

//creates a data store (table) for 'products'
const productStore = localforage.createInstance({
    name: dbName,
    storeName: 'products'
})

//creates a data store (table) for 'characters'
const characterStore = localforage.createInstance({
    name: dbName,
    storeName: 'characters'
})

//creates a data store (table) for 'categories'
const categoryStore = localforage.createInstance({
    name: dbName,
    storeName: 'categories'
})

//creates a data store (table) for 'data invalidation'
const storeInvalidation = localforage.createInstance({
    name: dbName,
    storeName: 'storeInvalidation'
})

// installs all of the cache items
self.addEventListener("install", event => {
    event.waitUntil(
        Promise.all(
            [
                caches.open(currentCaches.css)
                    .then(cache => {
                        return cache.addAll(cacheFiles.css)
                    }),
                caches.open(currentCaches.imgs)
                    .then(cache => {
                        return cache.addAll(cacheFiles.imgs)
                    }),
                caches.open(currentCaches.perm)
                    .then(cache => {
                        return cache.addAll(cacheFiles.perm)
                    }),
                ...cachesToDelete.map(cache => {
                    return caches.delete(cache)
                })
            ]
        )
    )

})

/**
 * In the event of a fetch call, check if any of the items in the
 * cacheFiles object has any values in either the css, imgs or perm properties.
 *
 */
self.addEventListener("fetch", function (event) {
    if ([...cacheFiles.css, ...cacheFiles.imgs, ...cacheFiles.perm]
        .includes(event.request.url)) {
        event.respondWith(
            caches.match(event.request)
                .then(function (response) {
                    if (response) {
                        console.log('returning file from cache')
                        return response
                    } else {
                        return fetch(event.request)
                    }
                })
        )
    }

    // check if request for data stored in the products.json file
    if (event.request.url.includes('data/products.json')) {
        event.respondWith(async function(){

            // create an object variable that resembles the parent properties of
            // the json in products.json
            let data = {products: [], categories: [], characters: []}

            // To ensure that old data is invalidated
            // compare the current time with the time that was saved
            // referencing each data store in the indexeddb
            // 'storeValidation' table
            const now = Date.now()
            const timeOut = 1800000
            const expiryTime = now - timeOut

            // fetch the values containing the time for possible invalidation
            const prodFetchTime = await storeInvalidation.getItem('productStore')
            const charFetchTime = await storeInvalidation.getItem('characterStore')
            const catFetchTime = await storeInvalidation.getItem('categoryStore')

            //  checks if the indexeddb data is not older than the allotted time.
            if (
                expiryTime < prodFetchTime &&
                expiryTime < charFetchTime &&
                expiryTime < catFetchTime
            ) {
                // fetch the data from the indexeddb stores
                await productStore.iterate(value => {data.products.push(value)})
                await categoryStore.iterate(value => {data.categories.push(value)})
                await characterStore.iterate(value => {data.characters.push(value)})

                // if the data is not empty
                if (
                    data.products.length > 0 &&
                    data.categories.length > 0 &&
                    data.characters.length > 0
                ) {
                    // return the indexeddb data as json
                    // finish executing function
                    return new Response(JSON.stringify(data), {
                        header: { "Content-Type": "application/json" }
                    })
                }
            }

            // if the data is older than the expiry time
            // fetch the data from the products.json
            const response = await fetch(event.request)
            data = await response.clone().json()

            // clear all of the data in indexeddb product store
            if (data.products.length > 0) {
                productStore.clear()
                storeInvalidation.setItem('productStore', now)
                data.products.forEach((product, key) => {
                    productStore.setItem(String(key), product);
                })
            }
             // clear all of the data in indexeddb characters store
            if (data.characters.length > 0) {
                characterStore.clear()
                storeInvalidation.setItem('characterStore', now)
                data.characters.forEach((product, key) => {
                    characterStore.setItem(String(key), product);
                })
            }
            // clear all of the data in indexeddb categories store
            if (data.categories.length > 0) {
                categoryStore.clear()
                storeInvalidation.setItem('categoryStore', now)
                data.categories.forEach((product, key) => {
                    categoryStore.setItem(String(key), product);
                })
            }

            return response
        }())
    }

})
