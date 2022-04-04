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
// @require      https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js
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


    function mlEmbed(){
        return document.querySelector("mona-lisa-embed");
    }

    function info(string) {
        mlEmbed().querySelector("#timeout_text").textContent = string;
    }

    function generateForm(){
        const ml = mlEmbed();

        var template = Handlebars.compile(`
<div style="position: absolute; top: 40%; left: 0; background-color: green; padding: 20px; border: thick double rgb(50, 161, 206); border-radius: 10px;">
    <h1>The Superstonk r/place supporter</h1>
    <form id="control-panel">
        <div><h1><input type="checkbox" id="should_run"><label for="should_run">Activate automatic clicking</label></h1></div>
        <h2>Restrict clicking area to these coordinates:</h2>
        <div>
            <input type="number" placeholder="X Min" style="width: 100px;" id="x_min">
            <input type="number" placeholder="Y Min" style="width: 100px;" id="y_min">
            <button type="button" id="use_current_min" style="background-color: lightgray;">Use currently selected coordinate</button>
        </div>
        <div>
            <input type="number" placeholder="X Max" style="width: 100px;" id="x_max">
            <input type="number" placeholder="Y Max" style="width: 100px;" id="y_max">
            <button type="button" id="use_current_max" style="background-color: lightgray;">Use currently selected coordinate</button>
        </div>
        <div><p id="timeout_text"></p></div>
        <div><input type="checkbox" id="should_debug"><label for="should_debug">Debug (don't actually place any tiles)</label></div>
        <div><input type="checkbox" id="should_show_overlay" checked><label for="should_show_overlay">Show the Overlay</label></div>
    </form>
</div>
`);
        ml.innerHTML += template();

        const form = ml.querySelector("#control-panel");

        form.querySelector('#should_run').onclick = function (event){run = event.target.checked;};
        form.querySelector('#should_debug').onclick = function (event){debug = event.target.checked;};
        form.querySelector('#should_show_overlay').onclick = function (event){
            const parent = ml.shadowRoot.querySelector("mona-lisa-canvas").shadowRoot.querySelector("div")
            const template_canvas = parent.querySelector("#template-canvas");
            template_canvas.style.display = (event.target.checked ? "block" : "none")
        };

        form.querySelector('#use_current_min').onclick = function (event){
            const pos = mlEmbed().shadowRoot.querySelector("mona-lisa-coordinates").shadowRoot.querySelector("div").textContent;
            var arr = /\((.*),(.*)\)/.exec(pos);
            x_min=arr[1];
            y_min=arr[2];
        };

        form.querySelector('#use_current_max').onclick = function (event){
            const pos = mlEmbed().shadowRoot.querySelector("mona-lisa-coordinates").shadowRoot.querySelector("div").textContent;
            var arr = /\((.*),(.*)\)/.exec(pos);
            x_max=arr[1];
            y_max=arr[2];
        };

        form.querySelector('#x_min').addEventListener('change', function (event){x_min = event.target.value;});
        form.querySelector('#y_min').addEventListener('change', function (event){y_min = event.target.value;});
        form.querySelector('#x_max').addEventListener('change', function (event){x_max = event.target.value;});
        form.querySelector('#y_max').addEventListener('change', function (event){y_max = event.target.value;});
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


            x_min = (X_OFFSET<=x_min && x_min<=template_img.width+X_OFFSET) ? x_min : X_OFFSET;
            x_max = (x_min<=x_max && x_max<=template_img.width+X_OFFSET) ? x_max : template_img.width+X_OFFSET;
            y_min = (Y_OFFSET<=y_min && y_min<=template_img.height+Y_OFFSET) ? y_min : Y_OFFSET;
            y_max = (y_min<=y_max && y_max<=template_img.height+Y_OFFSET) ? y_max : template_img.height+Y_OFFSET;

            mlEmbed().querySelector("#x_min").value = x_min;
            mlEmbed().querySelector("#y_min").value = y_min;
            mlEmbed().querySelector("#x_max").value = x_max;
            mlEmbed().querySelector("#y_max").value = y_max;

            if (run) {
                const ctx = canvas.getContext('2d');
                const errors = []

                for (let x = x_min; x <= x_max; x++) {
                    for (let y = y_min; y <= y_max; y++) {
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
            info("sleeping for " + timeout + "ms");
            await sleep(timeout);
        }
    }
}

window.addEventListener('load', run);

