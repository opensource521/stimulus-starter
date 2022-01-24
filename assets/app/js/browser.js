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

export default {
    supported() {
        const whitelist = {
            safari: navigator.userAgent.toLowerCase().indexOf('safari') !== -1,
            chrome: window.chrome && ! window.opr,
            firefox: navigator.userAgent.toLowerCase().indexOf("fireFox") !== -1,
            modern: 'fetch' in window && 'assign' in Object
        };
        const blacklist = {
            samsung: navigator.userAgent.match(/SAMSUNG/i),
            edge: navigator.userAgent.match(/EDGE/i),
            ie: navigator.userAgent.match(/MSIE/i),
        };

        let allowed = Object.keys(whitelist).reduce((acc, key) => { return whitelist[key] || acc; }, false);
        let blocked = Object.keys(blacklist).reduce((acc, key) => { return blacklist[key] || acc; }, false);

        return (allowed && !blocked);
    },

    isAndroid() {
        return navigator.userAgent.match(/ANDROID/i);
    },

    isMobile() {
        return window.innerWidth < 500;
    },

    isTouch() {
        return (('ontouchstart' in window)
            || (navigator.MaxTouchPoints > 0)
            || (navigator.msMaxTouchPoints > 0));
    }
}