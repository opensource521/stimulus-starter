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
    static targets = ["main"];
    static classes = ["scrolled"];

    initialize() {
        window.addEventListener("scroll", this.toggleNavbar.bind(this));
        this.toggleNavbar();
    }

    toggleNavbar(e) {
        const navbarHeight = parseFloat(window.getComputedStyle(this.mainTarget).height)

        if(window.pageYOffset > (navbarHeight + 30)){
            this.element.classList.add(this.scrolledClass);
        }     
        else{
            this.element.classList.remove(this.scrolledClass);
        }
    }
}
