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

import browser from "./browser";
import xhr from "./xhr";
import dom from "./dom";
import polyfills from "./polyfills";

let showingExpandable = false;
let grabbing = false;
let grabDiff = 0;
let grabStartY = 0;
let currentPopup = null;
let currentPopupInner = null;

export default {
    currentPopup, currentPopupInner, grabbing, grabDiff, grabStartY, showingExpandable,

    create(frameType, controller, element, callback, className) {
        // Remove any existing popups.

        this.popupLeft = false;
        this.popupCenter = false;

        let popup = dom.createElement("div", "popup");
        popup.setAttribute("data-target", controller + ".popup");
        popup.setAttribute("data-action", "mouseup->" + controller + "#releasePopup mousemove->" + controller + "#movePopup touchmove->" + controller + "#movePopup touchend->" + controller + "#releasePopup");
        popup.setAttribute("tabindex", "1");
        if (className) {
            popup.classList.add(className);
        }

        let popupInner = dom.createElement("div", "popup__inner", null, popup);
        popupInner.setAttribute('data-controller', "custom-scrollbar");
        let popupBg = dom.createElement("div", "popup__bg", null, popup);

        if(frameType !== "noclose-popup") {
            popupBg.setAttribute("data-action", "mousedown->" + controller + "#grabPopup touchstart->" + controller + "#grabPopup click->" + controller + "#closePopup");
            let popupTab = dom.createElement("div", "popup__close", null, popupInner);
            popupTab.setAttribute("data-action", "mousedown->" + controller + "#grabPopup touchstart->" + controller + "#grabPopup");
        }

        // popup spinner
        dom.createElement("div", "popup__spinner", `<div class="spinner spinner--dark"><div></div><div></div><div></div><div></div><div></div><div></div></div>`, popupInner);
        // popup content
        dom.createElement("div", "popup__content", null, popupInner);

        if (callback) {
            dom.runWhenContains(element, popup, callback);
        }

        element.append(popup);

        switch(frameType) {
            case "popup-left":
                popup.classList.add("popup--left");
                popupInner.classList.add("popup__inner--left");
                this.popupLeft = true;
                break;
            case "popup-center":
                popup.classList.add("popup--center");
                this.popupCenter = true;
                break;
            case "expandable-popup":
                popup.classList.add("popup--expandable");
                this.showingExpandable = true;
                break;
            case "message-popup":
                popup.classList.add("popup--message");
                popup.classList.add("popup--small");
                popupInner.setAttribute("data-action", "click->" + controller + "#closePopup");
                break;
            case "small-popup-center":
            case "small-popup": // fall-through
            case "noclose-popup":
                if (frameType === 'small-popup-center') {
                    popup.classList.add("popup--center");
                    this.popupCenter = true;
                }
                popup.classList.add("popup--small");
                if (frameType !== "noclose-popup") {
                    popupBg.setAttribute("data-action", "click->" + controller + "#closePopup");
                }
                break;
        }

        this.currentPopup = popup;
        this.currentPopupInner = popupInner;

        return popup;
    },

    close(popup) {

        if(popup == null) {
            popup = this.currentPopup;
        }
        if(popup === null) {
            return false;
        }

        let map = popup.querySelector('.checkout__map');

        popup.classList.remove("popup--show");
        popup.children[0].style.transition = "transform 200ms linear";
        if(browser.isMobile()) {
            popup.children[0].style.transform = "translate3d(0, 1000px, 0) scaleY(0.7)";
        } else {
            if(popup.classList.contains('popup--left')) {
                popup.children[0].style.transform = "translate3d(-1000px, 0px, 0)";
            } else if(popup.classList.contains('popup--center') || popup.classList.contains('popup--message')) {
                popup.children[0].style.transform = "translate3d(0, 1000px, 0)";
                popup.children[0].style.transition = "transform 300ms linear 0s";
            } else {
                popup.children[0].style.transform = "translate3d(1000px, 0px, 0)";
                if(map) {
                    map.style.transform = "translate3d(1000px, 0px, 0)";
                    map.style.transition = "transform 200ms linear 0s";
                }
            }
        }

        popup.removeAttribute("data-target");
        setTimeout(() => {
            popup.remove();
            this.showingExpandable = false;
        }, 300);
    },

    expand(popup) {
        if(popup == null) {
            popup = this.currentPopup;
        }
        if(popup == null) {
            return false;
        }

        popup.classList.remove("popup--expandable");
        popup.children[0].style.transform = "";
        popup.children[0].style.minHeight = "";
        popup.children[0].style.maxHeight = "";
        this.showingExpandable = false;
    },

    getTranslation(popupInner, windowHeight, offset) {
        return windowHeight * 1 - popupInner.offsetHeight - offset;
    },

    position(popup, windowHeight, offset, callback) {
        if(popup == null) {
            popup = this.currentPopup;
        }
        if(popup == null) {
            return false;
        }

        let grabOffset = 0;
        if(this.grabDiff !== 0) {
            grabOffset = -1 * Math.abs(this.grabDiff) / this.grabDiff * (this.grabDiff > 0 ? Math.pow(this.grabDiff, 1) : Math.pow(Math.abs(this.grabDiff), 1));
        }

        if(popup.classList.contains("popup--expandable")) {
            let translate = this.getTranslation(popup.children[0], windowHeight, offset) + grabOffset;
            popup.children[0].style.transform = "translate3d(0, " + translate + "px, 0) scaleX(0.92)";
        }
        else if(typeof (callback) == "function") {
            callback(grabOffset);
        }
        else {
            popup.children[0].style.transform = "translate3d(0, " + grabOffset + "px, 0)";
        }
    },

    loadFromURL(e) {
        dom.blockEvent(e, false, true);
        this.replaceContent(e.currentTarget.getAttribute("href"), this.currentPopup);
    },

    open(popup, windowHeight, height, offset) {
        this.currentPopupInner.style.maxHeight = height + "px";
        this.currentPopupInner.style.minHeight = height + "px";
        let translate = this.getTranslation(popup.children[0], windowHeight, offset);
        popup.children[0].style.transform = "translate3d(0, " + translate + "px, 0) scaleX(0.92)";
    },

    replaceContent(href, popup, callback) {
        // popup.classList.remove("popup--contentReady");
        dom.scrollToTop(popup);
        let transitionReady = false;
        let requestReady = false;
        let responseHTML = "";

        setTimeout(() => {
            transitionReady = true;
            finish();
        }, 120);

        xhr.get(href,
            (response) => {
                responseHTML = dom.getResponseContent(response).innerHTML;
                requestReady = true;
                if(typeof callback === "function") {
                    callback(response);
                }
                finish();
            },
        );

        const finish = (controller) => {
            if(transitionReady && requestReady) {
                let content = popup.getElementsByClassName("popup__content")[0];
                if(content) {
                    content.innerHTML = responseHTML;
                }
            }
        };
    },

    displayMessage(message, modClass, controller, target) {
        if(message) {
            let frameType = "message-popup";
            document.querySelectorAll(".popup--message").forEach(popup => popup.remove());
            let frame = this.create(frameType, controller, target);
            let messageHTML = document.createElement("div");
            messageHTML.innerHTML = "<p class='t-"+modClass+"'>" + message + "</p>";
            frame.children[0].append(messageHTML);

            setTimeout(() => {
                frame.classList.add("popup--show");
                frame.classList.add("popup--contentReady");
            }, 50);
        }
    },

    displaySuccessMessage(message, controller, target) {
        this.displayMessage(message, "success", controller, target);
    },

    displayErrorMessage(message, controller, target) {
        this.displayMessage(message, "error", controller, target);
    },

    displayHTMLMessage(html, controller, target, notDismissable, className) {
        if(html) {
            let frameType = notDismissable ? "noclose-popup" : "small-popup";
            document.querySelectorAll(".popup--message").forEach(popup => popup.remove());
            let popup = this.create(frameType, controller, target);
            if(className) {
                popup.classList.add(...className.split(','));
            }
            this.currentPopup = popup;
            popup.style.zIndex = "1000";
            popup.children[0].append(html);

            setTimeout(() => {
                popup.classList.add("popup--show");
                popup.classList.add("popup--contentReady");
            }, 50);
        }
    }
}
