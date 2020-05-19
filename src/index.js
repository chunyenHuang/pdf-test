const fs = require('fs');
const path = require('path');

const HummusRecipe = require('hummus-recipe');
const toPX = require('to-px');
// You may use puppeteer layers in the lambda environment
// https://github.com/alixaxel/chrome-aws-lambda
const puppeteer = require('puppeteer');

const toPt = (inValue) => {
    const px = toPX(inValue);
    const pt = px / 4 * 3;
    return pt;
};

const createHtmlPdf = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlString = fs.readFileSync(path.join(__dirname, 'sample.html'), 'utf-8');
    await page.setContent(htmlString);

    // transparent background
    await page.emulateMedia('screen');
    await page._emulationManager._client.send(
        'Emulation.setDefaultBackgroundColorOverride', {
            color: {
                r: 0,
                g: 0,
                b: 0,
                a: 0
            }
        }
    );

    const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
    });

    await browser.close();

    const buffer = Buffer.from(pdf);
    const filename = path.join(__dirname, 'html.pdf');
    fs.writeFileSync(filename, buffer);

    return filename;
}

const createOutputPdf = async (overlayPdfFilePath) => {
    const src = path.join(__dirname, 'sample.pdf');
    const output = path.join(__dirname, 'output.pdf');

    const recipe = new HummusRecipe(src, output);

    const textContent = [
        '<p style="text-align: center">Align Center</p>',
        '<span style="font-family: Helvetica">Plain Text</span>',
        '<b>Bold</b>',
        '<i>Italic</i>',
        '<span style="color: #0000ff">Blue</span>',
        '<span style="font-style: italic">Italic by font-style</span>',
        '<span style="font-size: 18pt">18pt</span>',
        '<span style="font-size: 30%">30%</span>',
        '<span style="font-weight: 800">Weight 800</span>',
        '<span style="text-decoration: underline">Underline</span>'
    ].join('<br/>');

    const overlayOptions = {
        keepAspectRatio: true,
        fitHeight: true,
        page: 1
    };

    recipe
        .editPage(1)
        .overlay(overlayPdfFilePath, overlayOptions)
        // convert px to pt for positioning
        .comment(textContent, toPt('300px'), toPt('300px'), {
            richText: true,
            open: true,
            align: 'center center'
        })
        .endPage()
        .endPDF();
};


(async () => {
    try {
        const htmlPdfFilePath = await createHtmlPdf();
        await createOutputPdf(htmlPdfFilePath);
    } catch (e) {
        console.log(e);
    }
})()