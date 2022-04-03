// ==UserScript==
// @name         SuperStonk rplace autoclicker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  support clicking
// @author       halfdane
// @match        https://hot-potato.reddit.com/embed*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// @updateURL    https://halfdane.github.io/rplace/supporter.user.js
// @downloadURL  https://halfdane.github.io/rplace/supporter.user.js
// ==/UserScript==

const X_OFFSET = 773
const Y_OFFSET = 735

async function run() {
    let run = false
    let debug=false;

    let x_min;
    let x_max;
    let y_min;
    let y_max;
    let timeout_text;

    const g = (e, t) =>
        new CustomEvent(e, {
            composed: !0,
            bubbles: !0,
            cancelable: !0,
            detail: t,
        });

    function sleep(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    const colors = {
        0:  "#6D001A",
        2:  "#FF4500",
        3:  "#FFA800",
        4:  "#FFD635",
        5:  "#FFF8B8",
        6:  "#00A368",
        7:  "#00CC78",
        8:  "#7EED56",
        9:  "#00756F",
        10: "#009EAA",
        11: "#00CCC0",
        12: "#2450A4",
        13: "#3690EA",
        14: "#51E9F4",
        15: "#493AC1",
        16: "#6A5CFF",
        17: "#94B3FF",
        18: "#811E9F",
        19: "#B44AC0",
        20: "#E4ABFF",
        21: "#DE107F",
        22: "#FF3881",
        23: "#FF99AA",
        24: "#6D482F",
        25: "#9C6926",
        26: "#FFB470",
        27: "#000000",
        28: "#515252",
        29: "#898D90",
        30: "#D4D7D9",
        31: "#FFFFFF",
    };
    for (const [k, v] of Object.entries(colors)) {
        colors[v] = k;
    }

    function checkbox(id, labelText, checked, onclick) {
        const elementDiv = document.createElement("div");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = checked;
        checkbox.id = id;
        checkbox.onclick = onclick;

        const label = document.createElement("label");
        label.htmlFor = id;
        label.appendChild(document.createTextNode(labelText));

        elementDiv.appendChild(checkbox);
        elementDiv.appendChild(label);
        return elementDiv;
    }

    function coordinates(minmax, value1, onchange1, value2, onchange2){
        const elementDiv = document.createElement("div");

        let checkbox;
        checkbox = document.createElement("input");
        checkbox.type = "number";
        checkbox.value = value1;
        checkbox.placeholder = "X "+minmax;
        checkbox.addEventListener('change', onchange1);
        checkbox.style.cssText = "width: 100px;"
        elementDiv.appendChild(checkbox);

        checkbox = document.createElement("input");
        checkbox.type = "number";
        checkbox.value = value2;
        checkbox.placeholder = "Y "+minmax;
        checkbox.addEventListener('change', onchange2);
        checkbox.style.cssText = "width: 100px;"
        elementDiv.appendChild(checkbox);

        return elementDiv;
    }

    function generateForm(){
        const ml = document.querySelector("mona-lisa-embed");
        const form = document.createElement("form");

        form.appendChild(checkbox("should_run", "Run the autoclicking", run, function (event){run = event.target.checked;} ));
        form.appendChild(checkbox("should_debug", "Debug (don't actually place any tiles)", debug, function (event){debug = event.target.checked;} ));
        form.appendChild(checkbox("should_show_overlay", "Show the Overlay", true, function (event){
            const parent = ml.shadowRoot.querySelector("mona-lisa-canvas").shadowRoot.querySelector("div")
            const template_canvas = parent.querySelector("#template-canvas");
            template_canvas.style.display = (event.target.checked ? "block" : "none")
        } ));

        form.appendChild(document.createTextNode("Restrict clicking area to these coordinates"));
        form.appendChild(document.createTextNode("Just leave empty if you're not sure what that means"));

        form.appendChild(coordinates("Min",
            x_min, function (event){x_min = event.target.value;}, y_min, function (event){y_min = event.target.value;}))
        form.appendChild(coordinates("Max",
            x_max, function (event){x_max = event.target.value;}, y_max, function (event){y_max = event.target.value;}))

        timeout_text = document.createTextNode("");
        form.appendChild(timeout_text);

        const div = document.createElement("div");
        div.appendChild(form);
        div.style.cssText = "position: absolute;bottom:200px;left: 40%;background-color: green; padding:20px;border: thick double #32a1ce; border-radius: 10px;";
        console.log(div)
        ml.appendChild(div);
    }

    function createOrGetTemplateCanvas(parent){
        const existing = parent.querySelector('#template-canvas')
        if (existing) {
            return existing;
        }
        const template_canvas = document.createElement("canvas");
        template_canvas.id = 'template-canvas';
        parent.appendChild(template_canvas);
        template_canvas.style.cssText = "position: absolute;top: "+Y_OFFSET+"px; left: "+X_OFFSET+"px;opacity: 50%;"
        return template_canvas;
    }

    async function get_template_ctx(ml_canvas){
        return new Promise((resolve, reject) => {
            let img = new Image()
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const template_canvas = createOrGetTemplateCanvas(ml_canvas.parentElement);
                template_canvas.width = img.width;
                template_canvas.height = img.height;
                const template_ctx = template_canvas.getContext("2d");
                template_ctx.drawImage(img, 0, 0);

                resolve({template_ctx: template_ctx, template_img: img})
            }
            img.onerror = reject
            img.src = "https://rplacesuperstonk.github.io/rplace-image/reference.png?tstamp=" + Math.floor(Date.now() / 10000);
        })
    }

    function getPixel(ctx, x, y) {
        const pixel = ctx.getImageData(x, y, 1, 1);
        const data = pixel.data;
        return (
            ("#" + data[0].toString(16).padStart(2, 0) + data[1].toString(16).padStart(2, 0) + data[2].toString(16).padStart(2, 0)).toUpperCase()
        );
    }

    async function setPixel(canvas, x, y, color) {
        canvas.dispatchEvent(g("click-canvas", { x, y }));
        await sleep(1_000+ Math.floor(Math.random() * 1_000));
        canvas.dispatchEvent(g("select-color", { color: 1*colors[color] }));
        await sleep(1_000+ Math.floor(Math.random() * 1_000));
        if (!debug){
            canvas.dispatchEvent(g("confirm-pixel"));
        }
    }

    await sleep(5_000);

    generateForm();

    while (true) {
        let edited = false;
        try{
            const ml = document.querySelector("mona-lisa-embed");
            const parent = ml.shadowRoot.querySelector("mona-lisa-canvas").shadowRoot.querySelector("div")
            const canvas = parent.querySelector("canvas")

            const {template_ctx, template_img} = await get_template_ctx(canvas);


            let x_min = (X_OFFSET<=x_min && x_min<=template_img.width+X_OFFSET) ? x_min : X_OFFSET;
            let x_max = (x_min<x_max && x_max<template_img.width+X_OFFSET) ? x_max : template_img.width+X_OFFSET;
            let y_min = (Y_OFFSET<y_min && y_min<template_img.height+Y_OFFSET) ? y_min : Y_OFFSET;
            let y_max = (y_min<y_max && y_max<template_img.height+Y_OFFSET) ? y_max : template_img.height+Y_OFFSET;

            console.log("focus area is", x_min, y_min, x_max, y_max);

            if (run) {
                const ctx = canvas.getContext('2d');
                const errors = []

                for (let x = x_min; x < x_max; x++) {
                    for (let y = y_min; y < y_max; y++) {
                        let correct = getPixel(template_ctx, x - X_OFFSET, y-Y_OFFSET);
                        let actual = getPixel(ctx, x, y);
                        if (actual !== correct) {
                            errors.push({x: x, y: y, correct: correct, actual: actual});
                        }
                    }
                }

                if (errors.length > 0) {
                    var e = errors[Math.floor(Math.random()*errors.length)];

                    console.log("(%s / %s) is %c%s%c but should be %c%s", e.x, e.y,
                        "background:"+e.actual, e.actual, "background:inherit;",
                        "background:"+e.correct, e.correct
                    )

                    await setPixel(canvas, e.x, e.y, e.correct);
                    if (!debug){
                        edited = true;
                    }
                }
            }
        } catch (error){
            console.log("ignoring", error);
        } finally {
            let timeout;
            if (edited) {
                timeout = 1_000 * 60 * 5 + 5_000 + Math.floor(Math.random() * 15_000);
            } else {
                timeout =Math.floor(Math.random() * 5_000);
            }
            if (debug){
                timeout = 1_000;
            }
            timeout_text.textContent = "sleeping for " + timeout + "ms";
            await sleep(timeout);
        }
    }
}

window.addEventListener('load', run);

