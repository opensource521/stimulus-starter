/*
 * CERVE PROPRIETARY INFORMATION
 *
 * This software is confidential. Cerve, or one of its
 * subsidiaries, has supplied this software to you under terms of a
 * license agreement, nondisclosure agreement or both.
 *
 * You may not copy, disclose, or use this software except in accordance with
 * those terms.
 *
 * Copyright (c) 2021 Cerve
 * ALL RIGHTS RESERVED.
 *
 * CERVE MAKES NO REPRESENTATIONS OR
 * WARRANTIES ABOUT THE SUITABILITY OF THE SOFTWARE,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, OR
 * NON-INFRINGEMENT. CERVE SHALL NOT BE
 * LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE
 * AS A RESULT OF USING, MODIFYING OR DISTRIBUTING
 * THIS SOFTWARE OR ITS DERIVATIVES.
 */

// import querystring from "query-string/index";

import "core-js/stable";
import "regenerator-runtime/runtime";
import dom from "./dom";
import browser from "./browser";

export default {
    binary(formId) {
        return {"body": new FormData(document.getElementById(formId))};
    },

    form(formId) {
        // The following line doesn't work everywhere yet. :(
        // return (new URLSearchParams(this.binary(formId)));
        // So, do it the old, hacky way.
        const data = new URLSearchParams();
        for (const pair of this.binary(formId).body) {
            data.append(pair[0], pair[1]);
        }
        return {"body": data};
    },

    json(data) {
        return {"type": "application/json", "body": JSON.stringify(data)};
    },

    decode(response) {
        let contentType = response.headers.get('content-type');
        if (contentType) {
            if (contentType.includes('application/json')) {
                return response.json();
            } else if (contentType.includes('text/html')) {
                return response.text();
            } else if (contentType.includes('text/plain')) {
                return response.text();
            }
        }
        return response.text();
    },

    responseHandler(response, success, error, stopRedirect) {
        if (response.redirected && !stopRedirect) {
            // If we followed a redirect, then just replace the current page's
            // style and body tags with the ones from the request.
            if(response.headers.get('content-type').includes('text/html')) {
                this.decode(response).then((html) => {
                    let el = document.createElement('html');
                    el.innerHTML = html;
                    let style = document.querySelector('style');
                    if(style) {
                        style.remove();
                    }
                    document.querySelector('head').append(el.querySelector("style"));
                    document.querySelector('body').remove();
                    document.querySelector('html').append(el.querySelector("body"));
                    if(response.url.includes("app.cerve")) {
                        document.querySelector("meta[name=\"csrf-token\"]").setAttribute("content", el.querySelector("meta[name=\"csrf-token\"]").getAttribute("content"));
                        document.querySelector("meta[name=\"user-token\"]").setAttribute("content", el.querySelector("meta[name=\"user-token\"]").getAttribute("content"));
                    }
                    else {
                        dom.displayFlashMessage();
                    }
                    history.pushState({}, "Cerve", response.url);
                });
                return;
            }
            // window.location.href = response.url;
        }
        if (response.ok) {
            if (typeof (success) == "function") {
                return this.decode(response).then(success);
            }
        } else {
            if (typeof (error) == "function") {
                return this.decode(response).then(error);
            }
        }
        return response;
    },

     async load(url) {
         const response = await fetch(url, {
                 method: 'GET',
                 redirect: 'follow',
                 headers: {
                     "Accept": "application/json",
                 }
             }
         );
         return await response.json();
    },

    get(url, success, error, fatal) {
        const controller = new AbortController();
        const { signal } = controller;
        const response = fetch(url, {
            method: 'GET',
            signal: signal,
            redirect: 'follow',
            headers: {
                "Accept": "application/json",
            },
        })
        .then(response => {
            return this.responseHandler(response, success, error);
        })
        .catch(response => {
            if (typeof (fatal) == "function") {
                return fatal(response);
            } else if (typeof (error) == "function") {
                return this.decode(response).then(error);
            }
        });

        return { response: response, abort: () => { controller.abort(); }, signal: signal };
    },

    put(url, data, success, error, fatal, stopRedirect) {
        let headers = {
            "Accept": "application/json",
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        };

        let body = null;
        if (data) {
            if (data.type) {
                headers["Content-Type"] = data.type;
            }
            if (data.body) {
                body = data.body;
            }
        }
        return fetch(url, {
            method: "PUT",
            redirect: 'follow',
            body: body,
            headers: headers,
        })
        .then(response => {
            return this.responseHandler(response, success, error, stopRedirect)
        })
        .catch(response => {
            if (typeof (fatal) == "function") {
                return fatal(response);
            } else if (typeof (error) == "function") {
                return this.decode(response).then(error);
            }
        });
    },

    post(url, data, success, error, fatal, stopRedirect) {
        let headers = {
            "Accept": "application/json",
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        };

        let body = null;
        if (data) {
            if (data.type) {
                headers["Content-Type"] = data.type;
            }
            if (data.body) {
                body = data.body;
            }
        }

        return fetch(url, {
            method: "POST",
            redirect: 'follow',
            body: body,
            headers: headers,
        })
        .then(response => {
            return this.responseHandler(response, success, error, stopRedirect)
        })
        .catch(response => {
            if (typeof (fatal) == "function") {
                return fatal(response);
            } else if (typeof (error) == "function") {
                return this.decode(response).then(error);
            }
        });
    },

    delete(url, success, error, fatal) {
        let headers = {
            "Accept": "application/json",
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        };
        return fetch(url, {
            method: "DELETE",
            redirect: 'follow',
            headers: headers,
        })
        .then(response => {
            return this.responseHandler(response, success, error)
        })
        .catch(response => {
            if (typeof (fatal) == "function") {
                return fatal(response);
            } else if (typeof (error) == "function") {
                return this.decode(response).then(error);
            }
        });
    }
};
