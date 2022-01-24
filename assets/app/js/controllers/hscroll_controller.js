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

export default class extends Controller {
    static targets = ["main", "track", "progress"];

    initialize() {
        this.hideScrollBar();
        this.scrollPage = 0;
        this.scrollPos = 0;
        this.scrollLeft = 0;
        this.childWidth = this.getChildWidth();
        this.childrenPerPage = Math.floor(window.innerWidth * 0.9 / this.childWidth);
        this.pageWidth = this.childrenPerPage * this.childWidth;
        this.pageCount = Math.ceil(this.trackTarget.children.length / this.childrenPerPage);
        this.scrollStartX = 0;
        this.scrollDiff = 0;
        this.scrolling = false;

        const io = new IntersectionObserver((entries) =>
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.src = image.dataset.src;
                    io.unobserve(image);
                }
            })
        );
        document.querySelectorAll(".image__inner").forEach((element) => io.observe(element));
    }

    getChildWidth() {
        let child = this.trackTarget.children[0];
        let style = child.currentStyle || window.getComputedStyle(child);
        let width = child.offsetWidth;
        let margin = parseFloat(style.marginRight);
        return width + margin + 3;
    }

    hideScrollBar() {
        // TODO(dev): implement
    }

    beginscroll(e) {
        // TODO(dev): implement
        e.preventDefault();

        this.scrolling = true;
        this.scrollStartX = e.pageX;
    }

    endScroll(e) {
        this.scrolling = false;
    }

    moveScroll(e) {
        // TODO(dev): implement
        if (!this.scrolling)
            return;

        e.preventDefault();

        this.scrollDiff = this.scrollStartX - e.pageX;
        this.animateScroll();
    }

    beginTouch(e) {
        // e.preventDefault();

        this.scrolling = true;
        this.scrollStartX = e.targetTouches[0].pageX;
    }

    endTouch(e) {
        this.scrolling = false;
    }

    moveTouch(e) {
        // TODO(dev): implement
        if (!this.scrolling)
            return;

        e.preventDefault();

        this.scrollDiff = this.scrollStartX - e.targetTouches[0].pageX;
        this.animateScroll();
    }

    scrollToNextPage() {
        // TODO(dev): implement
        this.scrollPage = Math.floor(this.trackTarget.scrollLeft / this.pageWidth) + 1;
        this.trackTarget.scroll({top: 0, left: this.scrollPage * this.pageWidth, behavior: 'smooth'})
    }

    animateScroll() {
        // TODO(dev): implement
        this.trackTarget.scroll({top: 0, left: this.trackTarget.scrollLeft + (this.scrollDiff*1.3), behavior: 'smooth'});
    }
}
