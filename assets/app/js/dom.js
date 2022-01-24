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
import polyfills from "./polyfills";

export default {

    blockEvent(e, allowDefault, allowPropagation) {
        if(e) {
            allowDefault || function() {
                //console.trace("default prevented");
                e.preventDefault();
            }();
            allowPropagation || function() {
                //console.trace("propagation stopped");
                //e.stopImmediatePropagation();
                e.stopPropagation();
            }();
        }
    },

    supportsTemplate() {
        return 'content' in document.createElement('template');
    },

    getWindowDimensions(target) {
        if(window.innerWidth > 600) {
            var wh = target.getBoundingClientRect().height;
            var ww = target.getBoundingClientRect().width;
        }
        else {
            var wh = window.innerHeight;
            var ww = window.innerWidth;
        }

        return {"height": wh, "width": ww};
    },

    scrollToTop(element) {
        if(element.scrollTop > 1) {
            element.scrollTop -= Math.ceil(element.scrollTop / 8);
            requestAnimationFrame(() => {
                this.scrollToTop(element);
            });
        }
        else {
            element.scrollTop = 0;
        }
    },

    updateCSRFToken(responseDOM) {
        let csrf = responseDOM.querySelector('meta[name="csrf-token"]');
        if(csrf) {
            document.querySelector('meta[name="csrf-token"]').setAttribute("content", csrf.getAttribute("content"));
        }
    },

    updateUserToken(responseDOM) {
        let userToken = responseDOM.querySelector('meta[name="user-token"]');
        if(userToken) {
            document.querySelector('meta[name="user-token"]').setAttribute("content", userToken.getAttribute("content"));
        }
    },

    getResponseContent(responseText, id, preserveId) {
        id = id || "content";
        preserveId = preserveId || false;
        let responseDOM = new DOMParser().parseFromString(responseText, "text/html");
        let content = responseDOM.getElementById(id);
        this.updateCSRFToken(responseDOM);
        this.updateUserToken(responseDOM);
        if(!preserveId && content) {
            content.removeAttribute("id");
        }
        return content;
    },

    createElement(tagName, className, innerHTML, appendTo) {
        if(tagName) {
            let el = document.createElement(tagName);
            if(el) {
                if(className) {
                    el.classList = className;
                }
                if(innerHTML) {
                    el.innerHTML = innerHTML;
                }
                if(appendTo && appendTo.append) {
                    appendTo.append(el);
                }
                return el;
            }
        }
    },

    createTitleTextButton(title, text, buttonText, href) {
        var message = this.createElement("div", "u-hPad20 u-vPad20");
        if(title) {
            this.createElement("h2", "t-size24 t-bold u-mb20 t-lsMinus2 t-lh11 t-center u-hPadStandard", title, message);
        }
        if(text) {
            this.createElement("p", "t-center t-lh14 u-mb40", text, message);
        }
        if(buttonText) {
            var button = this.createElement("a", "button button--outline", buttonText, message);
            if(href) {
                button.setAttribute("href", href);
            }
            button.setAttribute("data-action", "click->async#closePopup");
        }

        return message;
    },

    createImageHeader(src) {
        var image = this.createElement("div", "image--header");
        var imageInner = this.createElement("div", "image__inner", null, image);
        imageInner.style.backgroundImage = "url(" + src + ")";
        return image;
    },

    runWhenContains(parent, child, callback) {
        let observer = new MutationObserver((mutations) => {
            if(parent.contains(child)) {
                callback();
                observer.disconnect();
            }
        });
        observer.observe(parent, {
            attributes: false,
            childList: true,
            characterData: false,
            subtree: true,
        });
    },

    displayMessage(content, modClass) {
        clearTimeout(this.removeMessageTimer);
        let message = this.createElement("div", "message " + modClass);
        let bg = this.createElement("div", "message__bg", null, message);
        bg.addEventListener("click", () => { message.classList.remove("show");});
        let popup = this.createElement("div", "message__popup", null, message);
        let inner = this.createElement("div", "message__inner", content, popup);
        /*
        var button = this.createElement("span", "message__button button button--white", buttonLabel, popup);
        button.addEventListener("click", () => { message.classList.remove("show");});
        */
        document.querySelectorAll(".message").forEach((el) => el.remove());
        document.documentElement.append(message);

        setTimeout(() => {
            message.classList.add("show");
            this.removeMessageTimer = setTimeout(() => {
                message.classList.remove("show");
                document.querySelectorAll(".message").forEach(el => el.remove());
            }, 5000);
        }, 10);

    },

    displaySuccessMessage(content) {
        this.displayMessage(content, "message--success");
    },

    displayErrorMessage(content) {
        this.displayMessage(content, "message--error");
    }
};
