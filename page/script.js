let normalTab = document.getElementById('normal')
let privateTab = document.getElementById('private')

/*
 * A DOM element deleter that can only delete the target once even if called
 * multiple times.
 */
class IdempotentElementDeleter {
    constructor(element) {
        this.element = element
        this.performed = false
    }

    run() {
        if (this.performed === false) {
            this.element.parentNode.removeChild(this.element)
            this.performed = true
        }
    }
}

let normalTabButtonDeleter = new IdempotentElementDeleter(normalTab)
let privateTabButtonDeleter = new IdempotentElementDeleter(privateTab)

browser.runtime.onMessage.addListener(function urlListener(request) {
    if (request.url) {
        document.getElementById('header').textContent += (' ' + request.url + ' into:')

        // try to auto detect privileged urls that can't be transfered
        // into/out of private windows
        {
            let privileged = false
            let url = request.url.toLowerCase()
            if (!url.includes('http:') && !url.includes('https:')) {
                privileged = url.includes('about:debugging')
                || url.includes('about:addons')
                || url.includes('about:config')
                || url.includes('about:newtab')
            }
            if (privileged) {
                // can't create privileged tabs so transfering between windows
                // doesn't work, but can still duplicate them.
                if (request.incognito) {
                    normalTabButtonDeleter.run()
                } else {
                    privateTabButtonDeleter.run()
                }

                document.querySelector('#privilegedTab').classList.remove('hidden')
            }
        }

        browser.runtime.onMessage.removeListener(urlListener)
    }
})

browser.runtime.onMessage.addListener(function incognitoAccessListener(request) {
    if (request.incognitoAccessQuery) {
        if (request.allowedIncognitoAccess === false) {
            // the only case that needs user notification is moving
            // a non incognito tab to an incognito window because
            // if incognito permissions are not given it is impossible
            // to launch the advanced duplication tab in a private
            // window
            privateTabButtonDeleter.run()

            document.querySelector('#privateBrowsingPermission').classList.remove('hidden')

            let launcher = document.querySelector('#openOptionsPage')
            let port = browser.runtime.connect({
                name: 'optionsPage'
            })
            launcher.addEventListener('click', () => {
                port.postMessage({
                    openOptionsPage: true
                })
            })
        }

        browser.runtime.onMessage.removeListener(incognitoAccessListener)
    }
})

normalTab.focus()

normalTab.addEventListener('mouseenter', () => {
    normalTab.focus()
})
privateTab.addEventListener('mouseenter', () => {
    privateTab.focus()
})

normalTab.addEventListener('click', () => {
    browser.runtime.sendMessage({
        selected: 'normal'
    })
})
normalTab.addEventListener('keypress', (event) => {
    if (normalTab === document.activeElement) {
        var key = event.which || event.keyCode;
        if (key === 13) { // 13 is enter
            browser.runtime.sendMessage({
                selected: 'normal'
            })
        }
    }
})

privateTab.addEventListener('click', () => {
    browser.runtime.sendMessage({
        selected: 'private'
    })
})
privateTab.addEventListener('keypress', (event) => {
    if (privateTab === document.activeElement) {
        var key = event.which || event.keyCode;
        if (key === 13) { // 13 is enter
            browser.runtime.sendMessage({
                selected: 'private'
            })
        }
    }
})
