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

import {Controller} from "stimulus";
import {clearAllBodyScrollLocks, disableBodyScroll} from "body-scroll-lock";

import browser from "../browser";
import dom from "../dom";
import popup from "../popup";
import xhr from "../xhr";

const MAX_QUANTITY = 99999;

export default class extends Controller {
    static targets = [
        "root",
        "viewport",
        "pill",
        "pillSmall",
        "pillCount",
        "pillLabel",
        "pillTotal",
        "pillSmallCount",
        "pillSmallTotal",
        "pageProductCount",
        "pageProductCountInput",
        "pageRelatedProductCount",
        "pageProductBadge",
        "popup",
        "expandableContent",
        "deliveryOption",
        "timeslotOption",
        "addAllWrap",
        "productCard",
        "orderTitle",
        "barLogo",
        "productsInCart",
        "productOutOfStock",
        "deliveryNotice"
    ];

    initialize() {
        if( ! navigator.cookieEnabled) {
            popup.displayErrorMessage(this.application.translate("COOKIES_DISABLED"), "async", this.rootTarget);
            return;
        }

        popup.displayFlashMessage("async", this.rootTarget);
        this.productCount = Number(this.pillCountTarget.innerHTML);
        this.priceTotal = Number(this.pillTotalTarget.innerHTML);
        this.currentProductCount = null;
        this.priceTotalLag = 0;
        this.checkoutStep = 0;
        this.orderMinimised = false;
        this.drawerDepth = 0;
        this.drawers = [];
        this.drawerPaths = [];
        this.showingPill = false;
        this.pillHeight = 82;
        this.popupDepth = 0;
        this.activeFrame = this.viewportTarget;
        this.loadingFrame = false;
        this.waitingToCount = null;
        this.incrementCount = 0;
        this.deliveryOption = null;

        this.updateCanProgressPermission();

        this.handleResize();
        window.addEventListener("resize", this.handleResize.bind(this));
        this.displayPill();
        this.viewportTarget.focus();
        window.addEventListener("popstate", this.handlePop.bind(this));
        this.inPop = false;
        this.disableScrollOptions = {
            allowTouchMove: el => {
                while (el && el !== document.body) {
                    if (el.getAttribute('body-scroll-lock-ignore') !== null) {
                        return true;
                    }

                    el = el.parentNode;
                }
            },
        };

        if( ! browser.supported()) {
            if( ! sessionStorage["browsermessage"]) {
                var message = dom.createTitleTextButton(
                    this.application.translate("BROWSER_NOT_SUPPORTED_HEADING"),
                    this.application.translate("BROWSER_NOT_SUPPORTED_MESSAGE"),
                    this.application.translate("BROWSER_NOT_SUPPORTED_CONFIRM"),
                );

                popup.displayHTMLMessage(message, "async", this.rootTarget, true);
                sessionStorage["browsermessage"] = true;
            }
        }
    }

    connect () {
        this.element[this.identifier] = this
    }

    submit(e) {
        dom.blockEvent(e);
        switch(e.currentTarget.getAttribute("method").toLowerCase()) {
            case "put":
                var req = xhr.put;
                break;
            case "post":
                var req = xhr.post;
                break;
        }

        req.call(
            xhr,
            e.currentTarget.getAttribute("action"),
            xhr.form(e.currentTarget.getAttribute("id")),
            (response) => {
                popup.displaySuccessMessage(response.message,"async", this.rootTarget);
            },
            (err) => {
                popup.displayErrorMessage(err.message, "async", this.rootTarget);
            });
    }

    customSubmit(e, success, error, fatal = null, stopRedirect = true) {
        dom.blockEvent(e);
        switch(e.currentTarget.getAttribute("method").toLowerCase()) {
            case "put":
                var req = xhr.put;
                break;
            case "post":
                var req = xhr.post;
                break;
        }

        req.call(
            xhr,
            e.currentTarget.getAttribute("action"),
            xhr.form(e.currentTarget.getAttribute("id")),
            success,
            error,
            fatal,
            stopRedirect
        );
    }

    changePassword(e) {
        if(browser.isMobile()) {
            this.application.getControllerForElementAndIdentifier(document.getElementById('change-password-form'), "form").submitAndDisable(e);
        } else {
            document.getElementById("popup-drawer").querySelector('[type=submit]').disabled = true;
            this.customSubmit(e, (response) => {
                document.getElementById("popup-drawer").querySelector('.drawer__close').click();
                popup.displayFlashMessage("async", this.rootTarget);
            }, (err) => {
                document.getElementById("popup-drawer").querySelector('[type=submit]').disabled = false;
                popup.displayErrorMessage(err.message, "async", this.rootTarget);
            })
        }
    }

    submitFormWithSuccessScreen(e) {
        if(browser.isMobile()) {
            if(e.currentTarget.dataset.loadEmptyDrawer != undefined) {
                this.loadInEmptyDrawer(e);
            } else {
                this.submit(e);
            }
        } else {
            this.popupTarget.classList.remove('popup--contentReady');
            setTimeout(()=> {this.popupTarget.querySelector('.popup__inner').scrollTop = 0;},490);

            this.customSubmit(e, (response) => {
                popup.displayFlashMessage("async", this.rootTarget);
                let responseHTML = dom.getResponseContent(response).innerHTML;
                let innerDrawer = document.getElementById('popup-drawer');

                innerDrawer.innerHTML = responseHTML;

                this.popupTarget.classList.add('popup--contentReady');

            }, (err) => {
                popup.displayErrorMessage(err.message, "async", this.rootTarget);

                this.popupTarget.classList.add('popup--contentReady');
            })
        }
    }

    handleResize() {
        dom.getWindowDimensions(this.rootTarget);

        if(this.checkoutStep < 1) {
            this.popupTargets.forEach(this.positionPopup.bind(this));
        }
    }

    handlePop(e) {
        if( ! this.inPop) {
            this.inPop = true;
            if(e.state) {
                if(this[e.state.method]) {
                    this[e.state.method].bind(this)();
                }
                this.closePopup();
            }
        }
        this.inPop = false;
    }


    // Transition General Functions
    loadInFrame(frameType, classes, href, id, method, completionCallback, contentId, backButton) {
        method = method || "get";
        method = method.toLowerCase();
        backButton = backButton !== "false";

        let dimensions = dom.getWindowDimensions(this.rootTarget);
        if( ! this.loadingFrame) {
            this.loadingFrame = true;
            var frame;

            switch(frameType) {
                case "popup":
                case "popup-left":
                case "popup-center":
                case "small-popup":
                case "small-popup-center":
                case "expandable-popup":
                    frame = popup.create(frameType, "async", this.rootTarget, () => {
                        if(frameType === "expandable-popup") {
                            let p = this.openPopup(frame, 372);
                        }
                        frame.classList.add("popup--show");
                        if(browser.isMobile()) {
                            disableBodyScroll(frame, this.disableScrollOptions);
                        } else {
                            disableBodyScroll(frame.querySelector('.popup__inner'), this.disableScrollOptions);
                        }
                    }, classes);
                    break;
                case "drawer":
                case "product-search-drawer":
                case "impersonate-search-drawer":
                case "empty-drawer":
                case "form-drawer":
                case "empty-form-drawer":
                    contentId = contentId || "drawer";
                    this.drawerDepth++;
                    frame = this.createDrawer(frameType, backButton, () => {
                        if( ! ["form-drawer", "empty-form-drawer"].includes(frameType)) {
                            this.viewportTarget.style.transform = "translate3d(" + (this.drawerDepth * dimensions.width * -1) + "px, 0, 0)";
                            this.drawers.forEach((drawer) => {
                                drawer.style.transform = "translate3d(" + (this.drawerDepth * dimensions.width * -1) + "px, 0, 0)";
                            });
                            frame.classList.add("drawer--show");
                        }
                        else {
                            this.element.classList.add("showLoading");
                        }
                    });
                    this.drawers.push(frame);
                    let inner = frame.getElementsByClassName("drawer__inner")[0];
                    if(inner) {
                        disableBodyScroll(inner, this.disableScrollOptions);
                    }
                    break;
                default:
            }

            let controller = this;
            let success = (response) => {
                let responseContent = dom.getResponseContent(response, contentId);
                switch(frameType) {
                    case "popup":
                    case "popup-left":
                    case "popup-center":
                    case "small-popup":
                    case "small-popup-center":
                    case "expandable-popup":
                        if(this.rootTarget.contains(frame)) {
                            let content = frame.getElementsByClassName("popup__content")[0];
                            if(content) {
                                content.append(responseContent);
                            }
                            if(frameType === "expandable-popup") {
                                let defaultHeight = 342;
                                let height = Math.max(controller.expandableContentTarget.offsetHeight + 40, defaultHeight);
                                if(height > dimensions.height) {
                                    height = dimensions.height - 200;
                                }
                                if(height > 400) {
                                    height -= 18;
                                }
                                this.openPopup(frame, height);
                            }
                            frame.classList.add("popup--contentReady");
                        }
                        break;
                    case "drawer":
                    case "product-search-drawer":
                    case "impersonate-search-drawer":
                    case "empty-drawer":
                    case "form-drawer":
                    case "empty-form-drawer":
                        if(this.rootTarget.contains(frame)) {
                            frame.children[0].children[0].append(responseContent);
                            if(responseContent.getAttribute("data-drawer-pad")) {
                                frame.children[0].style.paddingTop = Number(responseContent.getAttribute("data-drawer-pad")) + "px";
                            }
                            setTimeout(() => {
                                frame.classList.add("drawer--contentReady");
                                let inner = frame.getElementsByClassName("drawer__inner")[0];
                                inner.style.overflowY = "scroll";
                            }, 10);
                            controller.drawerPaths.push(window.location.pathname);
                            history.replaceState({method: "closeDrawer"}, "Cerve", window.location.pathname);
                            history.pushState(null, "Cerve", href);
                            if(["form-drawer", "empty-form-drawer"].includes(frameType)) {
                                this.animateDrawer();
                                frame.classList.add("drawer--show");
                                this.element.classList.remove("showLoading");
                            }
                        }
                        break;
                    default:
                        break;
                }

                if(completionCallback) {
                    completionCallback();
                }

                controller.loadingFrame = false;
            };
            let error = (error) => {
                switch(frameType) {
                    case "popup":
                    case "popup-left":
                    case "popup-center":
                    case "expandable-popup":
                    case "small-popup":
                    case "small-popup-center":
                        controller.closePopup(frame);
                        break;
                    case "drawer":
                    case "product-search-drawer":
                    case "impersonate-search-drawer":
                    case "empty-drawer":
                    case "empty-form-drawer":
                    case "form-drawer":
                        controller.closeDrawer();
                        break;
                    default:

                }
                popup.displayErrorMessage(error.message, "async", this.rootTarget);
                controller.loadingFrame = false;
                controller.canProgress = true;
            };

            switch(method) {
                case "get":
                    xhr.get(href, success, error);
                    break;
                case "post":
                    xhr.post(href, xhr.form(id), success, error);
                    break;
                case "put":
                    xhr.put(href, xhr.form(id), success, error);
                    break;
                case "delete":
                    xhr.delete(href, success, error);
                    break;
            }

            this.activeFrame = frame;
            document.activeElement.blur();
            this.activeFrame.focus();

            return frame;
        }
    }

    focusActiveFrame(e) {
    }

    // Popups

    /*********************** BEGIN ASYNC CONTROLLER SPECIFIC POPUP METHODS ***********************/
    openPopup(element, height) {
        let offset = this.showingPill ? this.pillHeight + 64 : 47;
        let dimensions = dom.getWindowDimensions(this.rootTarget);
        popup.open(element, dimensions.height, height, offset);
    }

    positionPopup(element) {
        let callback = null;
        if(this.checkoutStep >= 4) {
            callback = (grabOffset) => {
                if(this.orderMinimised) {
                    this.centerMapAndOptions(0, 200 - grabOffset);
                }
                else {
                    this.centerMapAndOptions(0, window.innerHeight - grabOffset);
                }
            };
        }
        let offset = this.showingPill ? this.pillHeight + 64 : 47;
        let dimensions = dom.getWindowDimensions(this.rootTarget);
        popup.position(element, dimensions.height, offset, callback);
    }

    closePopup(element) {
        if(this.checkoutStep <= 4) {
            // default if an event is passed.
            if(element === undefined || element.target) {
                element = popup.currentPopup;
            }
            popup.close(element);

            let isCheckoutFrame = element === this.checkoutFrame;

            if(isCheckoutFrame && !browser.isMobile()) {
                this.pillTarget.classList.remove("pill--showLabel");
            }

            setTimeout(() => {
                if(isCheckoutFrame) {
                    this.regressCheckout();
                }
                this.activeFrame = this.viewportTarget;
                this.activeFrame.focus();
                clearAllBodyScrollLocks();
                if(this.popupTargets.length > 0) {
                    popup.currentPopup = this.popupTargets[this.popupTargets.length - 1];
                }
            }, 300);

            // Reload cart if open behind popup.
            // Dmitrii: this was causing ECOM-673
            /*if(this.checkoutStep === 0 && this.checkoutFrame && element !== this.checkoutFrame) {
                popup.replaceContent("/order", this.checkoutFrame);
                this.displayPill();
            }*/
        }
    }

    /*********************** END ASYNC CONTROLLER SPECIFIC POPUP METHODS ***********************/

    /*********************** BEGIN POPUP EVENT HANDLER METHODS ***********************/
    grabPopup(e) {
        dom.blockEvent(e, true, false);
        // Only allow grab on expandable cards if the content is fully loaded, otherwise we end up in a bad state.
        // The whole popup stuff is over-complicated and needs a rewrite. :/
        if (e.target.closest(".popup--contentReady")) {
            popup.grabbing = true;
            if(["touchstart"].includes(e.type)) {
                popup.grabStartY = e.touches[0].clientY;
            }
            else {
                popup.grabStartY = e.pageY;
            }
        }
    }

    movePopup(e) {
        if(e.target.classList.contains('hScroll__card') || e.target.classList.contains('horizontalScroll__track')) {
            return;
        }
        dom.blockEvent(e, true, false);
        if(popup.grabbing) {
            if(["touchmove", "touchend"].includes(e.type)) {
                popup.grabDiff = popup.grabStartY - e.touches[0].clientY;
            }
            else if(e.buttons) {
                popup.grabDiff = popup.grabStartY - e.pageY;
                // FIXME: This is basically a hack for the desktop. mouseup events aren't registered
                // if the mouse is outside of the viewport, so we need to fake it a bit.
                if(e.pageY < 45 || e.pageY >= window.innerHeight - 20) {
                    this.releasePopup(e);
                    return;
                }
                if(popup.grabDiff <= -20) {
                    this.releasePopup(e);
                    return;
                }
            }

            if(popup.showingExpandable || popup.grabDiff < 0 || this.checkoutStep >= 4) {
                dom.blockEvent(e, false, true);
                this.positionPopup();
            }
        }
    }

    releasePopup(e) {
        if(e.target.classList.contains('hScroll__card') || e.target.classList.contains('horizontalScroll__track')) {
            return;
        }
        dom.blockEvent(e, true);
        if(popup.grabbing) {
            popup.grabbing = false;
            let expand = popup.grabDiff > 20;
            let close = popup.grabDiff < -20;
            popup.grabDiff = 0;
            if(this.checkoutStep < 4) {
                if(expand) {
                    popup.expand();
                }
                else if(close) {
                    this.closePopup();
                }
                else {
                    this.positionPopup();
                }
            }
            else {
                if((expand && this.orderMinimised) || (close && ! this.orderMinimised)) {
                    this.toggleMinimiseOrder();
                }
                else {
                    this.positionPopup();
                }
            }
        }
    }

    /*********************** END POPUP EVENT HANDLER METHODS ***********************/

    invokeAction(e) {
        if(browser.isMobile()) {
            this[e.currentTarget.dataset.actionMobile](e);
        } else {
            this[e.currentTarget.dataset.actionDesktop](e);
        }
    }

    loadInPage(e) {
        dom.blockEvent(e);
        let desktopUrl = e.currentTarget.dataset.hrefDesktop;

        if(!browser.isMobile()) {
            this.element.classList.add('showLoading');

            if(desktopUrl) {
                window.location = desktopUrl;
                return;
            }
        }

        window.location = e.currentTarget.getAttribute("href");
    }

    loadInCurrentPopup(e) {
        dom.blockEvent(e);

        this.popupTarget.classList.remove('popup--contentReady');
        setTimeout(()=> {this.popupTarget.querySelector('.popup__inner').scrollTop = 0;},490);

        let target = e.currentTarget || e.target;
        let url = target.getAttribute('href') || target.getAttribute('action');

        this.popupDepth++;
        if(this.popupDepth <= 1) {
            this.currentPopupPath = url;
        }

        this.currentRequest = xhr.get(url,
            (response) => {

                let innerDrawer;
                let popupContent = this.popupTarget.getElementsByClassName("popup__content")[0];
                let responseContent = dom.getResponseContent(response).innerHTML;

                if(!document.getElementById('popup-drawer')) {
                    innerDrawer = dom.createElement("div", "popup__content-inner", null, popupContent);
                    innerDrawer.id = "popup-drawer";
                } else {
                    innerDrawer = document.getElementById('popup-drawer');
                }

                this.popupTarget.classList.add('popup--contentInner');

                innerDrawer.innerHTML = responseContent;

                let backBtn = innerDrawer.querySelector('.drawer__close') || innerDrawer.querySelector('.search__close');

                if(backBtn) {
                    backBtn.setAttribute('data-action', '');
                    backBtn.addEventListener('click', (e) => {
                        dom.blockEvent(e);

                        if(this.popupDepth >= 2) {
                            this.popupDepth-=2;
                            e.currentTarget.setAttribute('href', this.currentPopupPath);
                            this.loadInCurrentPopup(e)
                        } else {
                            this.popupDepth = 0;
                            innerDrawer.innerHTML = "";
                            this.popupTarget.classList.remove('popup--contentInner');
                        }
                    })
                }

                this.popupTarget.classList.add('popup--contentReady');
            },
        );
    }

    /* desktop search */

    loadSearch(e) {

        this.searchValue = e.target.value;
        this.isSearching = true;
        document.querySelector('.search').classList.add("search--loading", "search--focus");

        if (this.searchValue.length > 0) {
            if(this.currentRequest) {
                this.currentRequest.abort();
            }
            this.currentRequest = xhr.get(
                "/products/search?q=" + encodeURIComponent(this.searchValue),
                (response) => {
                    if(this.isSearching) {
                        this.showSearchResults(response);
                    }
                },
            );
        } else {
            document.querySelector('.search').classList.remove("search--loading");
            setTimeout(() => {
                this.hideSearchResults();
            },120)
        }
    }

    showSearchResults(response) {
        document.getElementById('products-drawer').innerHTML = dom.getResponseContent(response).innerHTML;
        document.getElementById('products-drawer').style.display = "block";
        document.querySelector('.exploreHeader__scroll').style.display = "none";
        document.getElementById('products-content').style.display = "none";
        document.querySelector('.search').classList.remove("search--loading", "search--focus");
    }

    hideSearchResults() {
        this.isSearching = false;
        document.getElementById('products-drawer') .innerHTML = "";
        document.getElementById('products-drawer').style.display = "none";
        document.querySelector('.exploreHeader__scroll').style.display = "block";
        document.getElementById('products-content').style.display = "block";
        document.querySelector('.input-round--search').value = '';
    }

    hideLayout(e) {
        if(!this.isSearching) {
            document.querySelector('.exploreHeader__fixed').classList.add('exploreHeader__fixed--focus');
            document.querySelector('.search').classList.add('search--focus');
            this.barLogoTarget.classList.add('u-invisible');
        }
    }

    showLayout(e) {
        if(!this.isSearching) {
            document.querySelector('.exploreHeader__fixed').classList.remove('exploreHeader__fixed--focus');
            document.querySelector('.search').classList.remove('search--focus');
            this.barLogoTarget.classList.remove('u-invisible');
        }
    }

    /* desktop search */

    loadInPopup(e) {
        dom.blockEvent(e);
        this.popupDepth = 0;
        if(!e.target.classList.contains('productCountValue')) {
            let popupPosition = e.currentTarget.dataset.popupPosition || '';
            let popupClasses = e.currentTarget.dataset.popupClasses || '';
            this.loadInFrame("popup" + popupPosition, popupClasses, e.currentTarget.getAttribute("href"));
        }
    }

    loadInExpandablePopup(e) {
        dom.blockEvent(e);
        if(!e.target.classList.contains('productCountValue')) {
            this.loadInFrame("expandable-popup", "", e.currentTarget.getAttribute("href"));
        }
    }

    loadInSmallPopup(e) {
        dom.blockEvent(e);
        this.popupDepth = 0;
        let popupPosition = e.currentTarget.dataset.popupPosition || '';
        let popupClasses = e.currentTarget.dataset.popupClasses || '';
        this.loadInFrame("small-popup" + popupPosition, popupClasses, e.currentTarget.getAttribute("href"));
    }

    // Drawer

    loadInDrawer(e) {
        this.loadDrawer(e, "drawer");
    }

    loadInProductSearchDrawer(e) {
        this.loadDrawer(e, "product-search-drawer");
    }

    loadInImpersonateSearchDrawer(e) {
        this.loadDrawer(e, "impersonate-search-drawer");
    }

    loadInEmptyDrawer(e) {
        this.loadDrawer(e, "empty-drawer");
    }

    loadInFormDrawer(e) {
        this.loadDrawer(e, "form-drawer");
    }

    loadInEmptyFormDrawer(e) {
        this.loadDrawer(e, "empty-form-drawer");
    }

    loadDrawer(e, type) {
        dom.blockEvent(e);
        this.loadInFrame(
            type,
            "",
            e.currentTarget.getAttribute("href") || e.currentTarget.getAttribute("action"),
            e.currentTarget.getAttribute("id"),
            e.currentTarget.getAttribute("method"),
            null,
            e.currentTarget.getAttribute("data-id"),
            e.currentTarget.getAttribute("data-back-button"),
        );
    }

    createDrawer(frameType, backButton, callback) {
        let drawer = dom.createElement("div", "drawer");
        let dimensions = dom.getWindowDimensions(this.rootTarget);
        drawer.style.left = this.drawerDepth * dimensions.width + "px";
        let drawerInner = dom.createElement("div", "drawer__inner", null, drawer);
        drawerInner.setAttribute("data-controller", "explore-header");
        drawerInner.setAttribute("data-action", "scroll->explore-header#scroll");

        let drawerScroll = dom.createElement("div", "drawer__scroll", null, drawerInner);

        if( ! ["empty-drawer", "empty-form-drawer"].includes(frameType)) {
            if(backButton) {
                let drawerCloseButton = dom.createElement("div", "drawer__close iconButton", null, drawer);
                drawerCloseButton.setAttribute("data-action", "click->async#closeDrawer");
                let drawerCloseIcon = dom.createElement("img", "", null, drawerCloseButton);
                drawerCloseIcon.setAttribute("src", this.application.config("IMAGES")+"/left_arrow.svg");
            }
        }
        if(frameType === "product-search-drawer") {
            let drawerSearchButton = dom.createElement("div", "drawer__search iconButton", null, drawer);
            drawerSearchButton.setAttribute("data-controller", "search");
            drawerSearchButton.setAttribute("data-href", "/products/search");
            drawerSearchButton.setAttribute("data-action", "click->search#openSearch");
            let drawerSearchIcon = dom.createElement("img", "", null, drawerSearchButton);
            drawerSearchIcon.setAttribute("src", this.application.config("IMAGES")+"/search_icon.svg");
        }
        if(frameType === "impersonate-search-drawer") {
            let drawerSearchButton = dom.createElement("div", "drawer__search iconButton", null, drawer);
            drawerSearchButton.setAttribute("data-controller", "search");
            drawerSearchButton.setAttribute("data-href", "/account/impersonate/search");
            drawerSearchButton.setAttribute("data-action", "click->search#openSearch");
            let drawerSearchIcon = dom.createElement("img", "", null, drawerSearchButton);
            drawerSearchIcon.setAttribute("src", this.application.config("IMAGES")+"/search_icon.svg");
        }

        let drawerSpinner = document.createElement("div", "drawer__spinner", '<div class="spinner spinner--dark"><div></div><div></div><div></div><div></div><div></div><div></div></div>', drawer);

        if(callback) {
            dom.runWhenContains(this.rootTarget, drawer, callback);
        }

        this.rootTarget.append(drawer);
        return drawer;
    }

    animateDrawer() {
        let dimensions = dom.getWindowDimensions(this.rootTarget);
        this.viewportTarget.style.transform = "translate3d(" + (this.drawerDepth * dimensions.width * -1) + "px, 0, 0)";
        this.drawers.forEach((drawer) => {
            drawer.style.transform = "translate3d(" + (this.drawerDepth * dimensions.width * -1) + "px, 0, 0)";
        });
    }

    closeDrawer(e) {
        dom.blockEvent(e);
        if(this.drawerDepth > 0) {
            this.drawerDepth--;
            this.animateDrawer();

            var element = this.drawers.pop();
            setTimeout(() => {
                element.remove();
            }, 300);

            if(this.drawerDepth === 0) {
                this.activeFrame = this.viewportTarget;
                this.displayPill();
            }
            else {
                this.activeFrame = this.drawers[this.drawers.length - 1];
            }
            this.activeFrame.focus();
            clearAllBodyScrollLocks();
            this.element.classList.remove("showLoading");

            if(e && ! this.inPop) {
                this.inPop = true;
                history.back();
            }
        }
        else {
            if(e.currentTarget.href) {
                window.location = e.currentTarget.href;
            }
        }
    }

    // Pill

    addProduct(e) {
        dom.blockEvent(e);
        let productId = e.currentTarget.parentNode.getAttribute("data-productid") || undefined;
        let price = e.currentTarget.parentNode.getAttribute("data-productprice") || undefined;
        this.incrementProduct(productId, 1, price);
    }

    removeProduct(e) {
        dom.blockEvent(e);
        let productId = e.currentTarget.parentNode.getAttribute("data-productid") || undefined;
        let price = e.currentTarget.parentNode.getAttribute("data-productprice") || undefined;
        this.incrementProduct(productId, -1, price);
    }

    removeOutOfStockProduct(e) {
        dom.blockEvent(e);
        let productId = e.currentTarget.parentNode.getAttribute("data-productid") || undefined;
        let price = e.currentTarget.parentNode.getAttribute("data-productprice") || undefined;
        let productCount = e.currentTarget.parentNode.getAttribute("data-productcount") || undefined;
        this.incrementProduct(productId, -productCount, price);
    }

    addAllProducts() {
        if(this.hasAddAllWrapTarget) {
            for(var i = 0; i < this.addAllWrapTarget.children.length; i++) {
                var prodCard = this.addAllWrapTarget.children[i];
                if(prodCard.getAttribute("data-productid")) {
                    this.incrementProduct(prodCard.getAttribute("data-productid"), 1, prodCard.getAttribute("data-productprice"));
                }
            }
        }
    }

    removeAllProducts() {
        this.productCardTargets.forEach((element, i) => {
            if(element.querySelector('.productCountValue')) {
                let productCount = Number(element.querySelector('.productCountValue').value)
                if(productCount != 0) {
                    this.incrementProduct(element.getAttribute("data-productid"), -Number(element.querySelector('.productCountValue').value), element.getAttribute("data-productprice"), false, true);
                }
            }
        })
    }

    updateCanProgressPermission() {
        this.canProgress = this.hasPillSmallCountTarget && !!parseInt(this.pillSmallCountTarget.innerText);
    }

    incrementProduct(productId, count, price, keyboard, removeAll) {
        this.currentProductCount = null;

        if(count === undefined || productId === undefined) {
            popup.displayErrorMessage(this.application.translate["UNEXPECTED_ERROR"], "async", this.rootTarget);
            return false;
        }

        // Optimistically update the UI.
        this.updateProductUI(productId, count, price, keyboard, removeAll);
        this.canProgress = false;

        // Create a counter to assign a number to each request
        // to check if it is the latest one on success and a function
        // to check if the frontend matches the server response
        let incrementCount = ++this.incrementCount;
        const crossCheckOrder = (count, total) => {
            if(count !== this.productCount || total !== this.priceTotal) {
                // console.log("DISCREPENCY FOUND", count, this.productCount, total, this.priceTotal);
                this.productCount = count;
                this.priceTotal = total;
                this.countToPrice(this);
            }

            // Close the empty cart. We call closePopup() twice here as a hack
            // to make this work properly in mobile and desktop.
            if(this.productCount === 0) {
                setTimeout(this.closePopup.bind(this), 500);
                setTimeout(this.closePopup.bind(this), 1000);
            }
        };

        let success = (response) => {
            crossCheckOrder(response.Order.item_count, response.Order.subtotal);
            this.updateCanProgressPermission();
        };

        let error = (error) => {
            popup.displayErrorMessage(error.message, "async", this.rootTarget);
            // Cancel out changes made optimistically
            this.updateProductUI(productId, -count, price);
            this.updateCanProgressPermission();
        };

        // If the count is positive, we're adding the product to the cart,
        // otherwise, we're removing it.
        if(!removeAll) {
            if(count >= 0) {
                xhr.post(
                    "/order/products/" + productId + "/add",
                    xhr.json({"count": count}),
                    success,
                    error,
                );
            }
            else {
                xhr.post(
                    "/order/products/" + productId + "/remove",
                    xhr.json({"count": count}),
                    success,
                    error,
                );
            }

            this.disablePill();
        }
    }

    updateProductUI(productId, count, price, keyboard, removeAll) {
        let pillChange = count;
        let newProductCount;

        // Update the counter on the page
        if(!keyboard && this.hasPageProductCountTarget) {
            let pageProductCount = this.pageProductCountTargets[this.pageProductCountTargets.length - 1];
            let productCount = Number(pageProductCount.innerText);
            newProductCount = Math.max(0, productCount + count);
            pillChange = newProductCount - productCount;
            pageProductCount.innerText = newProductCount;
            if(this.hasPageRelatedProductCountTarget) {
                this.pageRelatedProductCountTargets.forEach(relatedProductCount =>
                {
                    relatedProductCount.innerText = newProductCount;
                    if (newProductCount <= 0) {
                        relatedProductCount.parentNode.classList.add("badge--hide");
                    } else {
                        relatedProductCount.parentNode.classList.remove("badge--hide");
                    }
                });
            }
        }

        // Update the counter on card and update cart if open
        this.productCardTargets.forEach((card) => {
            if(card.getAttribute("data-productid") === productId) {
                let productCountEl = card.getElementsByClassName("productCount")[0];
                let badgeDeal = card.querySelector('.badge--deal')
                if(newProductCount === undefined) {
                    newProductCount = Math.max(0, Number(productCountEl.innerText) + count);
                }
                productCountEl.innerText = newProductCount;
                if(card.getElementsByClassName('productCountValue').length) {
                    card.getElementsByClassName('productCountValue')[0].value = newProductCount;

                    if(newProductCount <= 0) {
                        card.getElementsByClassName('product-actions-zero')[0].classList.remove('u-none');
                        card.getElementsByClassName('product-actions')[0].classList.add('u-none');
                    } else {
                        card.getElementsByClassName('product-actions-zero')[0].classList.add('u-none');
                        card.getElementsByClassName('product-actions')[0].classList.remove('u-none');
                    }
                }
                if(newProductCount <= 0) {
                    productCountEl.parentNode.classList.add("badge--hide");

                    if(badgeDeal) {
                        productCountEl.parentNode.classList.remove("badge--spike", "badge--spike-active");

                        if(browser.isMobile()) {
                            badgeDeal.classList.remove('badge--hide', 'badge--spike-active');
                        } else {
                            badgeDeal.classList.remove('badge--spike-active');
                        }
                    }

                    if(card.classList.contains('cart-item')) {
                        card.classList.add('u-none');
                    }
                } else {
                    productCountEl.parentNode.classList.remove("badge--hide");

                    if(badgeDeal) {
                        productCountEl.parentNode.classList.add("badge--spike", "badge--spike-active");
                        if(browser.isMobile()) {
                            badgeDeal.classList.add('badge--hide');
                        } else {
                            badgeDeal.classList.add('badge--spike-active');
                        }

                        if(newProductCount.toString().length > 4) {
                            card.getElementsByClassName("badge")[0].classList.add('badge--5-digit');
                        } else {
                            card.getElementsByClassName("badge")[0].classList.remove('badge--5-digit');
                        }
                    }

                    if(card.classList.contains('cart-item')) {
                        card.classList.remove('u-none');
                    }
                }

                if(card.getElementsByClassName("productPrice").length) {
                    card.getElementsByClassName("productPrice")[0].innerHTML = (price.replace(/\D+/g, '') * newProductCount).toString();
                }
            }
        });

        //update deal badge in product page
        if(this.hasPageProductBadgeTarget) { this.pageProductBadgeTarget.classList.toggle('badge--spike-active', newProductCount); }

        //update delivery schedule notice in cart
        if(this.hasDeliveryNoticeTarget) {
            if(!document.querySelectorAll('.cart-item:not(.u-none)[data-delivery-schedule]').length) {
                this.deliveryNoticeTarget.classList.add('u-none');
            } else {
                this.deliveryNoticeTarget.classList.remove('u-none');
            }
        }

        this.productCount = Math.max(0, this.productCount + pillChange);
        if(this.hasProductsInCartTarget) { this.productsInCartTarget.innerText = this.productCount; }

        // Update the counter in the pill
        this.pillCountTarget.innerText = this.productCount;
        this.pillSmallCountTarget.innerText = this.productCount;

        // Update pill price
        this.priceTotal += (price * 100) * pillChange;
        clearTimeout(this.waitingToCount);
        this.waitingToCount = setTimeout(() => {
            if(removeAll) {
                this.priceTotal = 0;
                this.priceTotalLag = 999;
            }
            this.countToPrice(this);
        }, 10);

        // Handle pill animations
        this.displayPill();
        if(this.productCount > 1) {
            this.pillTarget.classList.add("pill--addAnimation");
        }
        clearTimeout(this.pillAnimationTimeout);
        this.pillAnimationTimeout = setTimeout(() => this.pillTarget.classList.remove("pill--addAnimation"), 500);
    }

    countToPrice(controller) {
        if(controller.priceTotal !== controller.priceTotalLag) {
            controller.priceTotalLag += Math.round((controller.priceTotal - controller.priceTotalLag) / 2);
            // If we have a rounding error, then substitute the actual total.
            if(controller.priceTotalLag === controller.priceTotal + 1 || controller.priceTotalLag === controller.priceTotal - 1) {
                controller.priceTotalLag = controller.priceTotal;
            }
            controller.pillTotalTarget.innerHTML = controller.priceTotalLag;
            controller.pillSmallTotalTarget.innerHTML = controller.priceTotalLag;
            requestAnimationFrame(() => controller.countToPrice(controller));
        }
    }

    focusProductCount(e) {
        let isRealInput = e.target.classList.contains('productCountValue');

        if(!isRealInput) {
            setTimeout(() => {
                document.getElementById("productCardControls").classList.add("u-none");
                document.getElementById("productCardDone").classList.remove("u-none");
                document.getElementById("productCardCountLabel").className = "t-altGrey";
            }, 0);
        }

        if(this.currentProductCount === null) {
            if(isRealInput) {
                this.currentProductCount = Number(e.target.value);
            } else {
                this.currentProductCount = Number(this.pageProductCountTarget.innerText);
            }
        }

        let input = e.currentTarget.parentNode.getElementsByTagName("input")[0];
        input.value = this.currentProductCount;

        // Uncomment this line if you want the number to be reset every time a user taps on it.
        // this.pageProductCountTarget.innerText = this.currentProductCount;

        if(!isRealInput) {
            input.onkeyup = (e) => {
                if((!["Delete", "Backspace"].includes(e.key) && isNaN(e.key)) || e.target.value.length > MAX_QUANTITY.toString().length) {
                    dom.blockEvent(e, false, true);
                    input.value = Number(this.pageProductCountTarget.innerText);
                    if(["Enter"].includes(e.key)) {
                        this.closeProductCount(e);
                    }
                    return false;
                }

                let value = Number(e.target.value);
                // e.target.value can be empty, so we need to check for that because it
                // turns into 0 when cast to a Number, which is a valid value.
                // Empty string and less than zero are invalid.
                if(e.target.value == "" || value < 0) {
                    e.target.value = "";
                    this.pageProductCountTarget.innerText = "";
                    e.target.focus();
                    return
                }

                // We'll never really hit this, but just in case.
                if(value > MAX_QUANTITY) {
                    value = MAX_QUANTITY;
                }

                this.pageProductCountTarget.innerText = value;
            };
        } else {
            e.currentTarget.onkeyup = (e) => {
                dom.blockEvent(e, false, true);
                if(["Enter"].includes(e.key)) {
                    e.currentTarget.blur();
                }
            };
        }

        input.onfocus = (e) => { setTimeout(() => { e.target.select(); }, 300); };
        input.focus();
        input.select();
    }

    closeProductCount(e) {

        let isRealInput = e.target.classList.contains('productCountValue');

        // Ensure correct position with closing keyboard
        for(var i = 0; i < 10; i++) {
            setTimeout(this.positionPopup.bind(this), i*100);
        }

        let input = e.currentTarget.parentNode.parentNode.getElementsByTagName("input")[0];
        let value = Number(input.value);
        if(value < 0) {
            popup.displayErrorMessage(this.application.translate("INVALID_PRODUCT_COUNT"), "async", this.rootTarget);
            input.value = this.currentProductCount;
            if(!isRealInput) {
                this.pageProductCountTarget.innerText = this.currentProductCount;
            }
            return false;
        }

        if(!isRealInput) {
            setTimeout(() => {
                document.getElementById("productCardDone").classList.add("u-none");
                document.getElementById("productCardControls").classList.remove("u-none");
                document.getElementById("productCardCountLabel").className = "";
            }, 0);
        }

        // If the input field is empty, then just reset it and the product count label to the current value and return.
        if(input.value == "") {
            input.value = this.currentProductCount;
            if(!isRealInput) {
                this.pageProductCountTarget.innerText = this.currentProductCount;
            }
            return;
        }

        if(value !== this.currentProductCount) {
            let productCountDiff = Math.abs(value) - this.currentProductCount;
            if(productCountDiff > 0 || Math.abs(productCountDiff) <= this.currentProductCount) {
                let productId = input.getAttribute("data-productid") || undefined;
                let price = input.getAttribute("data-productprice") || undefined;
                this.incrementProduct(productId, productCountDiff, price, true);
            }
        }

    }

    selectAdjustOption(e) {
        let target = e.currentTarget;
        let siblings = target.parentNode.children;
        for(let s = 0; s < siblings.length; s++) {
            if(siblings[s] !== target) {
                siblings[s].classList.remove("productOption--selected");
                siblings[s].classList.add("productOption--deselected");
            }
            else {
                siblings[s].classList.remove("productOption--deselected");
                siblings[s].classList.add("productOption--selected");
            }
        }
    }

    displayPill() {
        this.pillHeight = this.pillTarget.getBoundingClientRect().height;
        if(this.productCount > 0) {
            if( ! this.pillTarget.classList.contains("pill--no")) {
                this.pillTarget.classList.remove("pill--hidden");
                this.showingPill = true;
            }

            this.pillSmallTarget.classList.add('pill-small--show')
        }
        else {
            this.pillTarget.classList.add("pill--hidden");
            if(this.hasPillSmallTarget) { this.pillSmallTarget.classList.remove('pill-small--show'); }
            this.showingPill = false;
        }

        this.popupTargets.forEach((popup) => {
            if(popup.classList.contains("popup--expandable")) {
                this.positionPopup(popup);
            }
        });
    }

    hidePill() {
        this.pillTarget.classList.add("pill--hidden");
        this.showingPill = false;

        this.popupTargets.forEach((popup) => {
            if(popup.classList.contains("popup--expandable")) {
                this.positionPopup(popup);
            }
        });
    }

    disablePill(time) {
        this.pillDisabled = true;
        clearTimeout(this.pillDisableTimeout);
        this.pillDisableTimeout = setTimeout(() => {
            this.pillDisabled = false;
        }, time || 200);
        this.displayPill();
    }

    // Checkout

    progressToCart(e) {
        dom.blockEvent(e, true);
        this.updateCanProgressPermission();
        if( ! this.pillDisabled && this.canProgress) {
            this.disablePill();
            this.canProgress = false;
            this.loadInFrame("popup", "","/order", null, null, () => {
                this.checkoutFrame = this.activeFrame;
                this.checkoutStep = 0;
                this.popupTargets.forEach((popup) => {
                    if(popup !== this.checkoutFrame) {
                        this.closePopup(popup);
                    }
                });
                this.pillLabelTarget.innerHTML = this.pillLabelTarget.getAttribute("data-label-checkout");
                this.pillTarget.classList.add("pill--showLabel");
                this.pillTarget.setAttribute("data-action", "click->async#checkItemStock");
                setTimeout(() => {
                    this.canProgress = true;
                }, 500);
            });
        }
    }

    checkItemStock(e) {
        dom.blockEvent(e);
        if(this.hasProductOutOfStockTarget) {
            this.showOutOfStockMessage();
            return false;
        }
        else {
            this.progressToStep1();
        }
    }

    showOutOfStockMessage() {
        this.hidePill();
        this.loadInFrame("small-popup", "","/order/stock");
    }

    closeStockMessage() {
        this.closePopup();
        this.progressToCart();
    }

    progressToStep1(e) {
        dom.blockEvent(e);
        if( ! this.pillDisabled && this.checkoutFrame && this.canProgress) {

            if(this.checkoutStep < 1) {
                this.hidePill();
                this.canProgress = false;
                this.checkoutFrame.classList.add("checkout");
                this.checkoutFrame.classList.remove("popup--contentReady");

                // create map
                this.mapWrapper = document.createElement("div");
                this.mapWrapper.classList.add("checkout__map");
                this.checkoutFrame.append(this.mapWrapper);


                // create options
                this.optionsWrapper = document.createElement("div");
                this.optionsWrapper.classList.add("checkout__options");
                var inner = frame.getElementsByClassName("popup__inner")[0];
                inner.append(this.optionsWrapper);

                // hide bg content
                if(browser.isMobile()) {
                    this.viewportTarget.style.display = "none";
                }

                xhr.get("/order/fulfillment",
                    (response) => {
                        this.checkoutFrame.classList.add("popup--contentReady");

                        this.mapWrapper.innerHTML = dom.getResponseContent(response, "map").innerHTML;
                        this.optionsWrapper.innerHTML = dom.getResponseContent(response, "options").innerHTML;

                        this.checkoutFrame.classList.add("checkout--showOptions");
                        setTimeout(() => this.centerMapAndOptions(0), 10);
                        this.canProgress = true;

                        inner.scrollTo(0, 0)

                    },
                    (error) => {
                        this.canProgress = true;
                    },
                );
            }

            this.checkoutStep = 1;
            this.popupTargets.forEach((popup) => {
                if(popup !== this.checkoutFrame) {
                    this.closePopup(popup);
                }
            });
        }
    }

    progressToStep2(e) {
        dom.blockEvent(e);
        if(this.canProgress) {

            if(this.timeslotOption) {
                setTimeout(() => this.centerMapAndOptions(0), 10);
                this.hidePill();
                this.timeslotOptionTargets.forEach((target) => {
                    target.classList.remove("selector--selected");
                });
            }

            this.deliveryOptionTargets.forEach((target) => {
                target.classList.remove("image--selected");
            });

            e.currentTarget.classList.add("image--selected");
            this.deliveryOption = {
                "option": e.currentTarget.dataset.deliveryOption,
                "id": parseInt(e.currentTarget.getAttribute("data-productid")),
            };

            // Display map line
            let mapController = this.application.getControllerForElementAndIdentifier(this.mapWrapper.children[0], "map");
            if(mapController) {
                mapController.drawRoute(this.deliveryOption.option.toLowerCase() === "pickup" ? 1 : -1);
            }

            this.canProgress = false;
            xhr.get("/order/timeslots?id=" + this.deliveryOption.id,
                (response) => {
                    let when = document.querySelector("#when");
                    if(when) {
                        when.remove();
                    }
                    this.optionsWrapper.append(dom.getResponseContent(response, "when", true));
                    setTimeout(() => this.centerMapAndOptions(0), 10);
                    this.canProgress = true;
                },
                (error) => {
                    this.canProgress = true;
                },
            );

            this.checkoutStep = 2;
        }
    }

    progressToStep3(e) {
        dom.blockEvent(e);
        if(this.canProgress) {

            this.timeslotOptionTargets.forEach((target) => {
                target.classList.remove("selector--selected");
            });

            e.currentTarget.classList.add("selector--selected");
            this.timeslotOption = e.currentTarget.dataset.timeslotOption;

            if( !! this.timeslotOption) {
                this.canProgress = false;
                xhr.post(
                    "/order/fulfillment",
                    xhr.json({
                        "delivery": this.deliveryOption,
                        "timeslot": JSON.parse(this.timeslotOption)
                    }),
                    (response) => {
                        if(this.checkoutStep < 3) {
                            this.pillLabelTarget.innerHTML = this.pillLabelTarget.getAttribute("data-label-next");
                            this.pillTarget.setAttribute("data-action", "click->async#progressToStep4");
                            this.updateCartTotals(response.pillSubtotal, response.pillTotal);
                            this.displayPill();
                            if(browser.isMobile()) {
                                this.centerMapAndOptions(70);
                            } else {
                                setTimeout(() => this.centerMapAndOptions(0), 10);
                            }
                            this.checkoutStep = 3;
                        }
                        this.canProgress = true;
                    },
                    (error) => {
                        popup.displayErrorMessage(error.message, "async", this.rootTarget);
                        this.canProgress = true;
                    },
                );
            }
        }
    }

    updateCartTotals(subtotal, total) {
        try {
            document.getElementById("pill__subtotal").innerText = subtotal;
            document.getElementById("pill__total").innerText = total;
        }
        catch(e) {
            console.log(e);
        }
    }

    showTotalInCart(response) {
        try {
            let pillSubtotal = dom.getResponseContent(response, "pill__subtotal");
            let pillTotal = dom.getResponseContent(response, "pill__total");
            pillSubtotal.id = "pill__subtotal";
            pillSubtotal.style.display = "none";
            pillTotal.id = "pill__total";
            pillTotal.style.display = "block";
            document.getElementById(pillTotal.id).replaceWith(pillTotal);
            document.getElementById(pillSubtotal.id).replaceWith(pillSubtotal);
        }
        catch(e) {
            console.log(e);
        }
    }

    showSubtotalInCart() {
        try {
            document.getElementById("pill__subtotal").style.display = "block";
            document.getElementById("pill__total").style.display = "none";
        }
        catch(e) {
            console.log(e);
        }
    }

    progressToStep4(e) {
        dom.blockEvent(e);
        if(this.canProgress) {
            this.canProgress = false;
            let dimensions = dom.getWindowDimensions(this.rootTarget);
            this.centerMapAndOptions(0, dimensions.height);
            this.checkoutFrame.classList.remove("checkout--showOptions");
            this.checkoutFrame.classList.remove("popup--contentReady");
            xhr.get(
                "/order/review",
                (response) => {
                    this.showTotalInCart(response);
                    this.pillLabelTarget.innerHTML = this.pillLabelTarget.getAttribute("data-label-confirm-order");
                    this.pillTarget.setAttribute("data-action", "click->async#confirmOrder");

                    // create review
                    this.reviewWrapper = document.createElement("div");
                    this.reviewWrapper.classList.add("checkout__review");
                    this.reviewWrapper.innerHTML = dom.getResponseContent(response, "review").innerHTML;
                    this.checkoutFrame.children[0].append(this.reviewWrapper);
                    this.checkoutFrame.classList.add("popup--contentReady");

                    setTimeout(() => {
                        this.checkoutFrame.classList.add("checkout--showReview");
                    }, 10);
                    this.canProgress = true;
                },
                (error) => {
                    popup.displayErrorMessage(error.message, "async", this.rootTarget);
                    this.rootTarget.classList.remove("orderInProgress");
                    this.orderTitleTarget.innerHTML = this.orderTitleTarget.getAttribute("data-title-review-order");
                    this.canProgress = true;
                },
            );
            this.checkoutStep = 4;
        }
    }

    confirmOrder(e) {
        if(this.canProgress) {
            dom.blockEvent(e, false, true);
            this.canProgress = false;
            this.rootTarget.classList.add("orderInProgress");
            this.orderTitleTarget.innerHTML = this.orderTitleTarget.getAttribute("data-title-submitting-order");

            var error = (error) => {
                this.canProgress = true;
                this.rootTarget.classList.remove("orderInProgress");
                this.pillLabelTarget.innerHTML = this.pillLabelTarget.getAttribute("data-label-confirm-order");
                this.pillTarget.setAttribute("data-action", "click->async#confirmOrder");
                popup.displayErrorMessage(error.message, "async", this.rootTarget);
            };

            var success = (response) => {
                var orderId = response.order.id;
                xhr.get("/order/" + orderId,
                    (response) => {
                        this.removeAllProducts();
                        this.hidePill();
                        this.checkoutFrame.classList.remove("checkout--showReview");
                        dom.scrollToTop(this.checkoutFrame);

                        // create ongoing
                        this.ongoingWrapper = document.createElement("div");
                        this.ongoingWrapper.classList.add("checkout__ongoing");
                        let content = dom.getResponseContent(response, "ongoing");
                        content.querySelector('.js-tPad0').style.paddingTop = "0px";
                        if(content) {
                            this.ongoingWrapper.innerHTML = content.innerHTML;
                        }
                        this.checkoutFrame.children[0].append(this.ongoingWrapper);
                        /*
                        this.checkoutFrame.children[0].children[0].setAttribute('data-action', 'click->async#toggleMinimiseOrder')
                        this.checkoutFrame.removeAttribute('data-action');
                        this.checkoutFrame.children[1].setAttribute('data-action', 'click->async#toggleMinimiseOrder')
                        */
                        if(browser.isMobile()) {
                            history.pushState({}, "Cerve", "/account/orders/" + orderId);
                        }

                        setTimeout(() => {
                            this.toggleMinimiseOrder();
                            this.rootTarget.classList.remove("orderInProgress");
                            this.checkoutFrame.classList.add("checkout--showOngoing");
                        }, 200);
                        this.canProgress = true;
                    },
                    error,
                    error,
                );
            };

            // Submit the order.
            // TODO: Handle order creation errors.
            xhr.post(
                "/order/submit",
                null,
                success,
                error,
                error,
            );
        }
    }

    toggleMinimiseOrder() {
        if( ! this.orderMinimised) {
            if(browser.isMobile()) {
                this.centerMapAndOptions(0, 200);
            }
            this.checkoutFrame.classList.add("checkout--fixed");
        }
        else {
            let dimensions = dom.getWindowDimensions(this.rootTarget);
            if(browser.isMobile()) {
                this.centerMapAndOptions(0, dimensions.height);
            }
            this.checkoutFrame.classList.remove("checkout--fixed");
            // hack to fix bug with scrollHeight
            setTimeout(() => {
                this.checkoutFrame.style.overflowY = "hidden";
                setTimeout(() => this.checkoutFrame.style.overflowY = "scroll", 10);
            }, 290);

        }

        this.orderMinimised = ! this.orderMinimised;
    }

    centerMapAndOptions(extraOffset, optionsHeight) {
        optionsHeight = optionsHeight || this.optionsWrapper.offsetHeight + 110 + extraOffset;
        var wh = dom.getWindowDimensions(this.rootTarget).height;
        this.checkoutFrame.children[0].style.transform = "translate3d(0, " + (wh - optionsHeight) + "px, 0)";
        this.mapWrapper.children[0].style.transform = "translate3d(0, " + (optionsHeight / -2) + "px,0 )";
        dom.scrollToTop(this.checkoutFrame);
    }

    regressCheckout(e) {
        dom.blockEvent(e, true);
        if(this.canProgress) {
            switch(this.checkoutStep) {
                case 0:
                    // close cart
                    this.pillTarget.setAttribute("data-action", "click->async#progressToCart");
                    this.pillTarget.classList.remove("pill--showLabel");
                    this.displayPill();
                    this.checkoutFrame = null;
                    break;
                case 1:
                case 2:
                case 3:
                    // return to cart
                    this.displayPill();
                    this.pillLabelTarget.innerHTML = this.pillLabelTarget.getAttribute("data-label-checkout");
                    this.pillTarget.setAttribute("data-action", "click->async#checkItemStock");
                    this.checkoutFrame.classList.remove("checkout--showOptions");

                    let dimensions = dom.getWindowDimensions(this.rootTarget);
                    this.centerMapAndOptions(0, dimensions.height);
                    setTimeout(() => {
                        this.checkoutFrame.classList.remove("checkout");
                        this.displayPill();
                        popup.replaceContent("/order", this.checkoutFrame, (response) => {
                            this.showTotalInCart(response);
                            this.showSubtotalInCart();
                        });
                    }, 100);
                    setTimeout(() => {
                        this.viewportTarget.style.display = "block";
                    }, 500);
                    setTimeout(() => {
                        if(this.mapWrapper) {
                            this.mapWrapper.remove();
                        }
                        if(this.optionsWrapper) {
                            this.optionsWrapper.remove();
                        }
                    }, 300);
                    this.checkoutStep = 0;
                    break;
                case 4:
                    // return to options
                    this.showSubtotalInCart();
                    this.pillLabelTarget.innerHTML = this.pillLabelTarget.getAttribute("data-label-next");
                    this.pillTarget.setAttribute("data-action", "click->async#progressToStep4");
                    if(browser.isMobile()) {
                        this.centerMapAndOptions(60);
                    } else {
                        setTimeout(() => this.centerMapAndOptions(0), 10);
                    }
                    this.checkoutFrame.classList.remove("checkout--showReview");
                    this.checkoutFrame.classList.add("checkout--showOptions");
                    setTimeout(() => this.reviewWrapper.remove(), 300);
                    this.checkoutStep = 2;
                    break;
                default:
            }
        }
    }

    closeOrder(e) {
        dom.blockEvent(e, true);
        window.location = "/";
    }
}
