let typeList = ['add', 'get', 'put', 'getAll', 'getAllKeys']

const instance = {
    dbOperation: async function (type, data, key) {
        if (!typeList.includes(type)) {
            throw new Error(`操作类型错误, 仅支持: ${typeList.toString()} 方法`)
        }
        const readType = type === 'add' || type === 'put' ? 'readwrite' : 'readonly'
        const res = await this.dbInit()
        const objectStore = res.transaction('asin', readType).objectStore('asin')
        const response = new Promise((resolve, reject) => {
            let request
                // = type === 'getAll' || type === 'getAllKeys' ? objectStore[type](): objectStore[type](data)
            switch (type) {
                case 'add':
                    request = objectStore[type](data)
                    break;
                case 'get':
                    request = objectStore[type](data)
                    break;
                case 'put':
                    request = objectStore[type](data, key)
                    break;
                case 'getAll':
                    request = objectStore[type]()
                    break;
                case 'getAllKeys':
                    request = objectStore[type]()
                    break;
            }
            request.onsuccess = (res) => {
                resolve(res.target.result)
            }
            request.onerror = (err) => {
                reject(err)
            }
        })
        return response
    },
    dbInit: function () {
        return new Promise((resolve, reject) => {
            const connection = window.indexedDB.open('data', 1)
            connection.onsuccess = function (event) {
                resolve(event.target.result)
            }
            connection.onupgradeneeded = function (event) {
                const db = event.target.result
                if (!db.objectStoreNames.contains('asin')) {
                    db.createObjectStore('asin', {autoIncrement: true})
                }
            }
            connection.onerror = function (err) {
                reject(err)
            }
        })
    },
}

export default instance
